export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }
  
  // Validate URL
  try {
    const testUrl = new URL(url);
    if (!['http:', 'https:'].includes(testUrl.protocol)) {
      return res.status(400).json({ error: 'Only HTTP(S) URLs are supported' });
    }
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }
  
  // Track redirects
  const chain = [];
  let currentUrl = url;
  const maxRedirects = 10;
  const timeout = 10000; // 10 seconds
  
  try {
    for (let i = 0; i < maxRedirects; i++) {
      const startTime = Date.now();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        const response = await fetch(currentUrl, {
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'User-Agent': 'where-qr/1.0 (Redirect Tracker)',
          }
        });
        
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        
        chain.push({
          url: currentUrl,
          status: response.status,
          responseTime,
          redirectMethod: 'http-header',
          redirectDetails: `${response.status} redirect with Location header`
        });
        
        // Check if it's a standard HTTP redirect
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          
          if (location) {
            // Handle relative redirects
            try {
              currentUrl = new URL(location, currentUrl).href;
            } catch (e) {
              // If location is invalid, stop here
              break;
            }
          } else {
            // No location header, stop
            break;
          }
        } else if (response.status === 200) {
          // Check for JavaScript redirects in 200 responses
          try {
            const text = await response.text();
            const jsRedirectResult = extractJavaScriptRedirect(text, currentUrl);
            
            if (jsRedirectResult.url) {
              // Update the chain entry to include redirect details
              chain[chain.length - 1].redirectMethod = jsRedirectResult.method;
              chain[chain.length - 1].redirectDetails = jsRedirectResult.details;
              
              currentUrl = jsRedirectResult.url;
              // Continue the loop to follow the JavaScript redirect
              continue;
            } else {
              // No JavaScript redirect found, mark as final destination
              chain[chain.length - 1].redirectMethod = 'none';
              chain[chain.length - 1].redirectDetails = 'Final destination (no redirect detected)';
              break;
            }
          } catch (textError) {
            // If we can't read the response text, treat as final destination
            chain[chain.length - 1].redirectMethod = 'error';
            chain[chain.length - 1].redirectDetails = 'Could not read response body for redirect detection';
            break;
          }
        } else {
          // Not a redirect, we've reached the final destination
          chain[chain.length - 1].redirectMethod = 'none';
          chain[chain.length - 1].redirectDetails = `Final destination (HTTP ${response.status})`;
          break;
        }
      } catch (fetchError) {
        if (fetchError.name === 'AbortError') {
          chain.push({
            url: currentUrl,
            status: 0,
            error: 'Request timeout',
            responseTime: timeout,
            redirectMethod: 'error',
            redirectDetails: 'Request timed out after 10 seconds'
          });
        } else {
          chain.push({
            url: currentUrl,
            status: 0,
            error: fetchError.message,
            redirectMethod: 'error',
            redirectDetails: `Network error: ${fetchError.message}`
          });
        }
        break;
      }
    }
    
    return res.status(200).json({
      success: true,
      chain,
      originalUrl: url,
      finalUrl: chain.length > 0 ? chain[chain.length - 1].url : url,
      redirectCount: chain.filter(c => c.status >= 300 && c.status < 400).length,
      jsRedirectCount: chain.filter(c => c.status === 200).length - 1 // Subtract final destination
    });
    
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to track redirects',
      details: error.message
    });
  }
}

// Function to extract JavaScript redirect URLs from HTML content
function extractJavaScriptRedirect(html, baseUrl) {
  // Common JavaScript redirect patterns with descriptions
  const patterns = [
    {
      regex: /window\.location\.href\s*=\s*["']([^"']+)["']/i,
      method: 'javascript-window-href',
      description: 'JavaScript: window.location.href assignment'
    },
    {
      regex: /window\.location\.replace\s*\(\s*["']([^"']+)["']\s*\)/i,
      method: 'javascript-window-replace',
      description: 'JavaScript: window.location.replace() call'
    },
    {
      regex: /window\.location\s*=\s*["']([^"']+)["']/i,
      method: 'javascript-window-location',
      description: 'JavaScript: window.location assignment'
    },
    {
      regex: /location\.href\s*=\s*["']([^"']+)["']/i,
      method: 'javascript-location-href',
      description: 'JavaScript: location.href assignment'
    },
    {
      regex: /location\.replace\s*\(\s*["']([^"']+)["']\s*\)/i,
      method: 'javascript-location-replace',
      description: 'JavaScript: location.replace() call'
    },
    {
      regex: /location\s*=\s*["']([^"']+)["']/i,
      method: 'javascript-location',
      description: 'JavaScript: location assignment'
    },
    {
      regex: /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^;]*;\s*url=([^"']+)["']/i,
      method: 'meta-refresh',
      description: 'HTML: <meta http-equiv="refresh"> tag'
    },
    {
      regex: /<meta[^>]+content=["'][^;]*;\s*url=([^"']+)["'][^>]+http-equiv=["']refresh["']/i,
      method: 'meta-refresh-alt',
      description: 'HTML: <meta> refresh tag (alternative format)'
    }
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern.regex);
    if (match && match[1]) {
      try {
        // Handle relative URLs
        const redirectUrl = new URL(match[1], baseUrl).href;
        
        // Validate that it's a proper HTTP(S) URL and not a javascript: or other scheme
        const testUrl = new URL(redirectUrl);
        if (['http:', 'https:'].includes(testUrl.protocol)) {
          return {
            url: redirectUrl,
            method: pattern.method,
            details: pattern.description
          };
        }
      } catch (e) {
        // Invalid URL, continue to next pattern
        continue;
      }
    }
  }
  
  return {
    url: null,
    method: 'none',
    details: 'No redirect pattern detected in response'
  };
}