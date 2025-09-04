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
        
        // Check if it's a redirect
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
      redirectCount: chain.filter(c => c.status >= 300 && c.status < 400).length
    });
    
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to track redirects',
      details: error.message
    });
  }
}
