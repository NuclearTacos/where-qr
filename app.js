// QR scanner with multiple input methods and redirect tracking
const root = document.getElementById('root');

let state = {
    currentView: 'input', // 'input' or 'results'
    isScanning: false,
    scannedUrl: '',
    redirectChain: [],
    loading: false,
    error: '',
    stream: null,
    showFileUpload: false
};

// ============ RENDERING ============

function render() {
    if (state.currentView === 'input') {
        renderInputView();
    } else if (state.currentView === 'results') {
        renderResultsView();
    }
}

function renderInputView() {
    if (state.isScanning) {
        renderScanningView();
        return;
    }

    root.innerHTML = `
        <div class="min-h-screen bg-gray-50">
            <div class="container mx-auto px-4 py-8 max-w-2xl">
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <h1 class="text-3xl font-bold text-gray-800 mb-2">where-qr</h1>
                    <p class="text-gray-600 mb-6">Scan QR codes and track their redirect chains</p>
                    
                    <!-- Camera Scanning Section -->
                    <div class="mb-6">
                        <h3 class="text-lg font-semibold text-gray-700 mb-3">📷 Camera Scanning</h3>
                        <div class="flex gap-2">
                            <button onclick="startCameraScanning()" class="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                                Start Camera
                            </button>
                            <button onclick="startWebcamScanning()" class="flex-1 bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors">
                                Use Webcam
                            </button>
                        </div>
                    </div>

                    <!-- Manual URL Input Section -->
                    <div class="mb-6">
                        <h3 class="text-lg font-semibold text-gray-700 mb-3">✏️ Manual Input</h3>
                        <div class="flex gap-2">
                            <input 
                                type="url" 
                                id="manual-url-input" 
                                placeholder="Enter URL to track (https://example.com)" 
                                class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                onkeypress="if(event.key==='Enter') trackManualUrl()"
                            >
                            <button onclick="trackManualUrl()" class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors">
                                Track
                            </button>
                        </div>
                    </div>

                    <!-- File Upload Section -->
                    <div class="mb-6">
                        <button 
                            onclick="toggleFileUpload()" 
                            class="text-sm text-gray-600 hover:text-gray-800 underline flex items-center gap-1"
                        >
                            📁 Upload QR Image
                            <span class="text-xs">${state.showFileUpload ? '▼' : '▶'}</span>
                        </button>
                        
                        ${state.showFileUpload ? `
                            <div class="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <input 
                                    type="file" 
                                    id="qr-file-input" 
                                    accept="image/*"
                                    onchange="handleFileUpload(event)"
                                    class="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                >
                                <p class="text-xs text-gray-500 mt-2">Select an image file containing a QR code</p>
                                <button onclick="toggleFileUpload()" class="text-xs text-gray-400 hover:text-gray-600 mt-2">Cancel</button>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Test API Section -->
                    <div class="text-center pt-4 border-t border-gray-200">
                        <button onclick="testApi()" class="text-sm text-gray-500 hover:text-gray-700 underline">
                            Test API with sample URL
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderScanningView() {
    root.innerHTML = `
        <div class="min-h-screen bg-gray-50">
            <div class="container mx-auto px-4 py-8 max-w-2xl">
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <h1 class="text-3xl font-bold text-gray-800 mb-2">where-qr</h1>
                    <p class="text-gray-600 mb-6">Scanning for QR codes...</p>
                    
                    <div class="space-y-4">
                        <div class="relative bg-black rounded-lg overflow-hidden">
                            <video id="scanner-video" class="w-full h-auto" playsinline muted autoplay></video>
                            <canvas id="scanner-canvas" class="hidden"></canvas>
                            <div class="absolute inset-0 border-2 border-blue-400 m-12 rounded-lg animate-pulse"></div>
                        </div>
                        <button onclick="stopScanning()" class="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                            Cancel Scanning
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Start video after DOM update
    setTimeout(() => {
        const video = document.getElementById('scanner-video');
        if (video && state.stream) {
            video.srcObject = state.stream;
            detectQR();
        }
    }, 100);
}

function renderResultsView() {
    const chainHtml = state.redirectChain.map((item, index) => `
        <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div class="flex items-center justify-between mb-1">
                <span class="font-mono text-sm ${getStatusColor(item.status)}">
                    ${item.status} - ${getStatusText(item.status)}
                </span>
                <button onclick="copyToClipboard('${item.url.replace(/'/g, "\\'")}')" class="text-gray-500 hover:text-gray-700">
                    📋
                </button>
            </div>
            <div class="text-sm text-gray-600 break-all">
                ${index === 0 ? '🔗 ' : ''}${item.url}
            </div>
            ${item.responseTime ? `<div class="text-xs text-gray-500 mt-1">${item.responseTime}ms</div>` : ''}
        </div>
    `).join('');
    
    root.innerHTML = `
        <div class="min-h-screen bg-gray-50">
            <div class="container mx-auto px-4 py-8 max-w-2xl">
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <!-- Back Button -->
                    <button onclick="goBackToInput()" class="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2 transition-colors">
                        ← Scan Another Link
                    </button>

                    <h1 class="text-3xl font-bold text-gray-800 mb-2">where-qr</h1>
                    <p class="text-gray-600 mb-6">Scan results</p>
                    
                    ${state.error ? `
                        <div class="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
                            <div class="text-red-700">⚠️ ${state.error}</div>
                        </div>
                    ` : ''}
                    
                    <div class="bg-gray-50 p-4 rounded-lg mb-4">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm font-semibold text-gray-600">Analyzed URL:</span>
                            <button onclick="copyToClipboard('${state.scannedUrl.replace(/'/g, "\\'")}')" class="text-gray-500 hover:text-gray-700">
                                📋
                            </button>
                        </div>
                        <a href="${state.scannedUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline break-all">
                            ${state.scannedUrl} ↗️
                        </a>
                    </div>
                    
                    ${state.loading ? `
                        <div class="flex items-center justify-center py-8">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ` : ''}
                    
                    ${state.redirectChain.length > 0 ? `
                        <div class="space-y-3 mb-6">
                            <h3 class="font-semibold text-gray-700">Redirect Chain (${state.redirectChain.length} steps):</h3>
                            ${chainHtml}
                        </div>
                    ` : ''}
                </div>
                
                <div class="mt-4 text-center text-xs text-gray-500">
                    <p>Deployed on: ${window.location.hostname}</p>
                    <p>API endpoint: ${window.location.origin}/api/track</p>
                </div>
            </div>
        </div>
    `;
}

// ============ CAMERA SCANNING ============

async function startCameraScanning() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        
        state.stream = stream;
        state.isScanning = true;
        state.error = '';
        render();
    } catch (err) {
        console.error('Camera error:', err);
        // Fallback to any available camera
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            state.stream = stream;
            state.isScanning = true;
            state.error = '';
            render();
        } catch (fallbackErr) {
            alert('Camera access denied or not available. Please allow camera permissions or try manual input.');
            console.error(fallbackErr);
        }
    }
}

async function startWebcamScanning() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' }
        });
        
        state.stream = stream;
        state.isScanning = true;
        state.error = '';
        render();
    } catch (err) {
        console.error('Webcam error:', err);
        // Fallback to any available camera
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            state.stream = stream;
            state.isScanning = true;
            state.error = '';
            render();
        } catch (fallbackErr) {
            alert('Webcam access denied or not available. Please allow camera permissions or try manual input.');
            console.error(fallbackErr);
        }
    }
}

function stopScanning() {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
        state.stream = null;
    }
    state.isScanning = false;
    render();
}

async function detectQR() {
    const video = document.getElementById('scanner-video');
    const canvas = document.getElementById('scanner-canvas');
    
    if (!video || !canvas || !state.isScanning) return;
    
    const context = canvas.getContext('2d');
    
    try {
        // Try BarcodeDetector first (more efficient, Chrome/Edge only)
        if ('BarcodeDetector' in window) {
            const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await barcodeDetector.detect(video);
            
            if (barcodes.length > 0) {
                const url = barcodes[0].rawValue;
                handleDetectedUrl(url);
                return;
            }
        } else {
            // Fallback to jsQR for other browsers
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (code) {
                handleDetectedUrl(code.data);
                return;
            }
        }
    } catch (err) {
        console.error('QR detection error:', err);
    }
    
    if (state.isScanning) {
        requestAnimationFrame(detectQR);
    }
}

// ============ MANUAL INPUT ============

function trackManualUrl() {
    const input = document.getElementById('manual-url-input');
    const url = input.value.trim();
    
    if (!url) {
        alert('Please enter a URL');
        return;
    }
    
    if (!isValidUrl(url)) {
        alert('Please enter a valid URL (must start with http:// or https://)');
        return;
    }
    
    handleDetectedUrl(url);
}

function toggleFileUpload() {
    state.showFileUpload = !state.showFileUpload;
    render();
}

// ============ FILE UPLOAD ============

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const imageData = await getImageDataFromFile(file);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
            handleDetectedUrl(code.data);
        } else {
            alert('No QR code found in the uploaded image. Please try a different image.');
        }
    } catch (err) {
        console.error('File processing error:', err);
        alert('Error processing the uploaded file. Please try again.');
    }
}

function getImageDataFromFile(file) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0);
            
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            resolve(imageData);
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

// ============ URL PROCESSING ============

function handleDetectedUrl(url) {
    if (!isValidUrl(url)) {
        alert('Detected content is not a valid URL: ' + url);
        return;
    }
    
    state.scannedUrl = url;
    state.currentView = 'results';
    stopScanning();
    checkRedirects(url);
}

function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

async function checkRedirects(url) {
    state.loading = true;
    state.redirectChain = [];
    state.error = '';
    render();
    
    try {
        const apiUrl = `${window.location.origin}/api/track?url=${encodeURIComponent(url)}`;
        console.log('Calling API:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`API error (${response.status}): ${text}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        if (data.error) {
            state.error = data.error;
        } else {
            state.redirectChain = data.chain || [];
        }
    } catch (err) {
        state.error = `Failed to track redirects: ${err.message}`;
        console.error('Redirect tracking error:', err);
    }
    
    state.loading = false;
    render();
}

// ============ NAVIGATION ============

function goBackToInput() {
    state.currentView = 'input';
    state.scannedUrl = '';
    state.redirectChain = [];
    state.loading = false;
    state.error = '';
    state.showFileUpload = false;
    
    // Clear manual input
    setTimeout(() => {
        const input = document.getElementById('manual-url-input');
        if (input) input.value = '';
    }, 100);
    
    render();
}

// ============ UTILITIES ============

async function testApi() {
    handleDetectedUrl('https://bit.ly/example');
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            alert('Copied to clipboard!');
        } catch (fallbackErr) {
            console.error('Fallback copy failed:', fallbackErr);
            alert('Failed to copy to clipboard');
        }
        document.body.removeChild(textArea);
    }
}

function getStatusColor(status) {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 300 && status < 400) return 'text-blue-600';
    if (status >= 400 && status < 500) return 'text-yellow-600';
    if (status >= 500) return 'text-red-600';
    return 'text-gray-600';
}

function getStatusText(status) {
    const statusTexts = {
        200: 'OK',
        301: 'Moved Permanently',
        302: 'Found (Temporary Redirect)',
        307: 'Temporary Redirect',
        308: 'Permanent Redirect',
        400: 'Bad Request',
        403: 'Forbidden',
        404: 'Not Found',
        500: 'Server Error'
    };
    return statusTexts[status] || `Status ${status}`;
}

// ============ GLOBAL FUNCTIONS ============

// Make functions available globally for onclick handlers
window.startCameraScanning = startCameraScanning;
window.startWebcamScanning = startWebcamScanning;
window.stopScanning = stopScanning;
window.trackManualUrl = trackManualUrl;
window.toggleFileUpload = toggleFileUpload;
window.handleFileUpload = handleFileUpload;
window.goBackToInput = goBackToInput;
window.testApi = testApi;
window.copyToClipboard = copyToClipboard;

// ============ INITIALIZATION ============

// Initial render when page loads
document.addEventListener('DOMContentLoaded', render);