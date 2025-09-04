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
          responseTime
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
            const jsRedirectUrl = extractJavaScriptRedirect(text, currentUrl);
            
            if (jsRedirectUrl) {
              currentUrl = jsRedirectUrl;
              // Continue the loop to follow the JavaScript redirect
              continue;
            } else {
              // No JavaScript redirect found, we've reached the final destination
              break;
            }
          } catch (textError) {
            // If we can't read the response text, treat as final destination
            break;
          }
        } else {
          // Not a redirect, we've reached the final destination
          break;
        }
      } catch (fetchError) {
        if (fetchError.name === 'AbortError') {
          chain.push({
            url: currentUrl,
            status: 0,
            error: 'Request timeout',
            responseTime: timeout
          });
        } else {
          chain.push({
            url: currentUrl,
            status: 0,
            error: fetchError.message
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
  // Common JavaScript redirect patterns
  const patterns = [
    // window.location.href = "url"
    /window\.location\.href\s*=\s*["']([^"']+)["']/i,
    // window.location.replace("url")
    /window\.location\.replace\s*\(\s*["']([^"']+)["']\s*\)/i,
    // window.location = "url"
    /window\.location\s*=\s*["']([^"']+)["']/i,
    // location.href = "url"
    /location\.href\s*=\s*["']([^"']+)["']/i,
    // location.replace("url")
    /location\.replace\s*\(\s*["']([^"']+)["']\s*\)/i,
    // location = "url"
    /location\s*=\s*["']([^"']+)["']/i,
    // Meta refresh: <meta http-equiv="refresh" content="0;url=...">
    /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^;]*;\s*url=([^"']+)["']/i,
    // Meta refresh alternative format
    /<meta[^>]+content=["'][^;]*;\s*url=([^"']+)["'][^>]+http-equiv=["']refresh["']/i
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      try {
        // Handle relative URLs
        const redirectUrl = new URL(match[1], baseUrl).href;
        
        // Validate that it's a proper HTTP(S) URL and not a javascript: or other scheme
        const testUrl = new URL(redirectUrl);
        if (['http:', 'https:'].includes(testUrl.protocol)) {
          return redirectUrl;
        }
      } catch (e) {
        // Invalid URL, continue to next pattern
        continue;
      }
    }
  }
  
  return null;
}