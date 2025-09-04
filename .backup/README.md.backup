# where-qr

A web-based QR code scanner with redirect tracking capabilities.

## Overview

This is a single-page web application that allows users to scan QR codes using their device's camera. The app is built with React and uses the Web BarcodeDetector API for QR code scanning functionality.

## Features

- **QR Code Scanning**: Scan QR codes using your device's camera
- **URL Detection**: Automatically detects if the scanned content is a URL
- **Redirect Tracking**: Attempts to track redirect chains for URLs (limited by CORS)
- **Mobile-Friendly**: Responsive design optimized for mobile devices
- **Permission Handling**: Clear guidance for camera permission management

## Usage

1. Open `index.html` in a supported web browser
2. Click "Start Scanning" to activate your camera
3. Position the QR code within the camera frame
4. The app will automatically detect and display the QR code content
5. If the content is a URL, you can click to open it in a new tab

## Browser Requirements

This application requires a browser that supports the BarcodeDetector API:

- **Recommended**: Chrome/Chromium (version 83+)
- **Also Supported**: Edge (Chromium-based)
- **Limited Support**: Opera, Samsung Internet
- **Not Supported**: Firefox, Safari

### Tested Devices
- Pixel 7 Pro (Chrome) - Full functionality
- Other Android devices with Chrome
- Desktop Chrome with webcam

## Technical Details

- **Framework**: React 18 (loaded via CDN)
- **Styling**: Tailwind CSS
- **Icons**: Lucide Icons
- **Build**: No build step required - runs directly in browser
- **Dependencies**: All loaded from CDNs, no local installation needed

## Known Limitations

1. **CORS Restrictions**: The redirect tracking feature cannot follow redirects due to browser CORS policies. To fully track redirects, you would need:
   - A backend proxy service
   - Or deploy this on a server with appropriate CORS headers
   - Or use a third-party CORS proxy service

2. **Browser Support**: Limited to browsers that support the BarcodeDetector API

3. **HTTPS Required**: Camera access requires HTTPS (or localhost) in most browsers

## Development

To run locally:
1. Clone this repository
2. Serve the files using any web server (e.g., `python -m http.server 8000`)
3. Open `http://localhost:8000` in a supported browser

For production deployment:
- Consider minifying the JavaScript
- Set up proper HTTPS
- Add a backend service if redirect tracking is needed

## License

See LICENSE file for details.
