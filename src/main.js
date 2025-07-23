import './style.css'
// Try the browser-specific import for svg-text-to-path with fontkit renderer instead
import Session from 'svg-text-to-path/entries/browser-fontkit.js'

// Create the HTML structure
document.querySelector('#app').innerHTML = `
  <div class="container">
    <h1>SVG Text to Vector Path Generator</h1>
    <div class="input-section">
      <label for="textInput">Enter your text:</label>
      <input type="text" id="textInput" placeholder="Type something..." />
      
      <div class="font-upload">
        <label for="fontFile">Drag & Drop Font File or Click to Browse</label>
        <input type="file" id="fontFile" accept=".ttf,.otf,.woff,.woff2" />
        <span id="fontStatus">No font uploaded (using fallback)</span>
        <small style="color: #888; display: block; margin-top: 5px;">Supports: .ttf, .otf, .woff, .woff2</small>
      </div>
      
      <div class="controls">
        <label for="fontSize">Font Size:</label>
        <input type="range" id="fontSize" min="12" max="48" value="16" />
        <span id="fontSizeValue">16px</span>
        
        <label for="colorPicker">Text Color:</label>
        <input type="color" id="colorPicker" value="#333333" />
      </div>
    </div>
    <div class="svg-container">
      <div id="svgOutput"></div>
      <div class="download-section" id="downloadSection">
        <button id="downloadBtn">Download SVG</button>
      </div>
    </div>
  </div>
`;

// Get references to elements
const textInput = document.getElementById('textInput');
const svgOutput = document.getElementById('svgOutput');
const fontSize = document.getElementById('fontSize');
const fontSizeValue = document.getElementById('fontSizeValue');
const colorPicker = document.getElementById('colorPicker');
const downloadSection = document.getElementById('downloadSection');
const downloadBtn = document.getElementById('downloadBtn');
const fontFile = document.getElementById('fontFile');
const fontStatus = document.getElementById('fontStatus');
const fontUploadArea = document.querySelector('.font-upload');

// Store uploaded font data
let uploadedFontData = null;
let uploadedFontName = null;
let defaultFontData = null;

// Load default font on startup
async function loadDefaultFont() {
    try {
        fontStatus.textContent = 'Loading default font...';
        fontStatus.style.color = '#4CAF50';

        const response = await fetch('/Roboto-Regular.ttf');
        if (!response.ok) {
            throw new Error('Failed to fetch default font');
        }

        const arrayBuffer = await response.arrayBuffer();
        defaultFontData = arrayBuffer;

        fontStatus.textContent = 'Default font loaded: Roboto Regular';
        fontStatus.style.color = '#4CAF50';

        console.log('Default font (Roboto Regular) loaded successfully');

        // Auto-generate if there's text
        if (textInput.value.trim()) {
            await generateSVG(textInput.value);
        }

    } catch (error) {
        console.error('Error loading default font:', error);
        fontStatus.textContent = 'Default font failed to load (using fallback)';
        fontStatus.style.color = '#d32f2f';
        defaultFontData = null;
    }
}

// Load default font when page loads
loadDefaultFont();

// Handle font file upload
fontFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        try {
            await processFontFile(file);
        } catch (error) {
            console.error('Error loading font:', error);
            fontStatus.textContent = error.message || 'Error loading font';
            fontStatus.style.color = '#d32f2f';
            uploadedFontData = null;
            uploadedFontName = null;
        }
    } else {
        uploadedFontData = null;
        uploadedFontName = null;
        fontStatus.textContent = 'Using default font: Roboto Regular';
        fontStatus.style.color = '#4CAF50';
    }
});

// Helper function to process font file (used by both file input and drag & drop)
async function processFontFile(file) {
    // Validate file type
    const allowedTypes = ['.ttf', '.otf', '.woff', '.woff2'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

    if (!allowedTypes.includes(fileExtension)) {
        throw new Error('Please upload a valid font file (.ttf, .otf, .woff, .woff2)');
    }

    fontStatus.textContent = 'Loading font...';
    fontStatus.style.color = '#4CAF50';

    // Read the font file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    uploadedFontData = arrayBuffer;
    uploadedFontName = file.name.split('.')[0]; // Get filename without extension

    fontStatus.textContent = `Font loaded: ${file.name}`;
    fontStatus.style.color = '#4CAF50';

    // Auto-regenerate if there's text
    if (textInput.value.trim()) {
        await generateSVG(textInput.value);
    }
}

// Drag and drop functionality
fontUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fontUploadArea.classList.add('drag-over');
});

fontUploadArea.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fontUploadArea.classList.add('drag-active');
});

fontUploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Only remove classes if we're actually leaving the upload area
    if (!fontUploadArea.contains(e.relatedTarget)) {
        fontUploadArea.classList.remove('drag-over', 'drag-active');
    }
});

fontUploadArea.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    fontUploadArea.classList.remove('drag-over', 'drag-active');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];

        try {
            await processFontFile(file);

            // Update the file input to reflect the dropped file
            const dt = new DataTransfer();
            dt.items.add(file);
            fontFile.files = dt.files;

        } catch (error) {
            console.error('Error processing dropped font:', error);
            fontStatus.textContent = error.message || 'Error loading font';
            fontStatus.style.color = '#d32f2f';
            uploadedFontData = null;
            uploadedFontName = null;
        }
    }
});

// Click to upload functionality
fontUploadArea.addEventListener('click', (e) => {
    // Don't trigger if clicking on the file input itself
    if (e.target !== fontFile) {
        fontFile.click();
    }
});

// Function to generate SVG with text
async function generateSVG(text) {
    if (!text.trim()) {
        svgOutput.innerHTML = '<p class="error">Please enter some text!</p>';
        return;
    }

    try {
        // Get current font size and color
        const currentFontSize = fontSize.value;
        const currentColor = colorPicker.value;
        const shouldSplitPaths = true; // Always split into separate paths

        // Calculate approximate text width (rough estimation)
        const textLength = text.length;
        const charWidth = currentFontSize * 0.6; // approximate character width based on font size
        const padding = 40;
        const svgWidth = Math.max(200, textLength * charWidth + padding);
        const svgHeight = Math.max(80, parseInt(currentFontSize) * 2 + 40);

        // Create SVG element with text (use uploaded font name if available, otherwise Roboto)
        const fontFamily = uploadedFontName || 'Roboto';
        const svgString = `
        <svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
          <text x="50%" y="50%" 
                dominant-baseline="middle" 
                text-anchor="middle" 
                font-family="${fontFamily}" 
                font-size="${currentFontSize}" 
                fill="${currentColor}">
            ${escapeHtml(text)}
          </text>
        </svg>
        `;

        // Convert text to paths using svg-text-to-path
        console.log('Original SVG:', svgString);

        // Try different session configurations
        let session;
        let convertedSvg;

        try {
            // First attempt: try with uploaded font if available
            if (uploadedFontData && uploadedFontName) {
                console.log('Using uploaded font:', uploadedFontName);

                // Try different approaches for font loading
                let fontUrl;
                let session;

                try {
                    // Approach 1: Direct ArrayBuffer
                    session = new Session(svgString, {
                        fonts: {
                            [uploadedFontName]: [{
                                wght: 400,
                                ital: 0,
                                source: uploadedFontData // Try passing ArrayBuffer directly
                            }]
                        },
                        noFontAction: 'error', // Change to error to see what's happening
                        split: shouldSplitPaths,
                        decimals: 2
                    });

                    const result = await session.replaceAll();
                    console.log('Replacement result (direct ArrayBuffer):', result);
                    convertedSvg = session.getSvgString();

                } catch (directError) {
                    console.log('Direct ArrayBuffer failed:', directError.message);

                    // Clean up and try approach 2
                    if (session) session.destroy();

                    // Approach 2: Blob URL with different MIME types
                    const mimeTypes = [
                        'font/ttf',
                        'font/otf',
                        'font/woff',
                        'font/woff2',
                        'application/font-woff',
                        'application/x-font-ttf',
                        'application/x-font-opentype'
                    ];

                    let success = false;
                    for (const mimeType of mimeTypes) {
                        try {
                            console.log(`Trying MIME type: ${mimeType}`);
                            const fontBlob = new Blob([uploadedFontData], { type: mimeType });
                            fontUrl = URL.createObjectURL(fontBlob);

                            session = new Session(svgString, {
                                fonts: {
                                    [uploadedFontName]: [{
                                        wght: 400,
                                        ital: 0,
                                        source: fontUrl
                                    }]
                                },
                                noFontAction: 'error',
                                split: shouldSplitPaths,
                                decimals: 2
                            });

                            const result = await session.replaceAll();
                            console.log(`Replacement result (${mimeType}):`, result);

                            // Check if we actually got paths
                            const resultSvg = session.getSvgString();
                            if (resultSvg.includes('<path')) {
                                // Crop SVG to exact path bounds
                                convertedSvg = cropSVGToPathBounds(resultSvg);
                                success = true;
                                console.log('Success! Found path elements');
                                break;
                            } else {
                                console.log('No path elements found, trying next MIME type');
                                if (session) session.destroy();
                            }

                        } catch (mimeError) {
                            console.log(`MIME type ${mimeType} failed:`, mimeError.message);
                            if (session) session.destroy();
                            if (fontUrl) URL.revokeObjectURL(fontUrl);
                        }
                    }

                    if (!success) {
                        throw new Error('All font loading approaches failed for uploaded font');
                    }
                }

                // Clean up the blob URL if it was created
                if (fontUrl) URL.revokeObjectURL(fontUrl);

            } else if (defaultFontData) {
                // Second attempt: use default Roboto font
                console.log('Using default font: Roboto');

                const fontBlob = new Blob([defaultFontData], { type: 'font/ttf' });
                const fontUrl = URL.createObjectURL(fontBlob);

                session = new Session(svgString, {
                    fonts: {
                        'Roboto': [{
                            wght: 400,
                            ital: 0,
                            source: fontUrl
                        }]
                    },
                    noFontAction: 'error',
                    split: shouldSplitPaths,
                    decimals: 2
                });

                const result = await session.replaceAll();
                console.log('Replacement result (default Roboto):', result);

                const resultSvg = session.getSvgString();
                if (resultSvg.includes('<path')) {
                    convertedSvg = cropSVGToPathBounds(resultSvg);
                } else {
                    throw new Error('No paths generated with default font');
                }

                // Clean up the blob URL
                URL.revokeObjectURL(fontUrl);

            } else {
                // Third attempt: try Google Fonts fallback
                console.log('No fonts available, trying Google Fonts fallback');
                session = new Session(svgString, {
                    fonts: {
                        'Arial': [{
                            wght: 400,
                            ital: 0,
                            source: 'https://fonts.gstatic.com/s/opensans/v40/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4taVIGxA.woff2'
                        }]
                    },
                    noFontAction: 'skipChar',
                    split: shouldSplitPaths,
                    decimals: 2
                });

                const result = await session.replaceAll();
                console.log('Replacement result (Google Fonts):', result);
                convertedSvg = session.getSvgString();
            }

        } catch (firstError) {
            console.log('svg-text-to-path library failed:', firstError.message);

            // Clean up first session
            if (session) session.destroy();

            // Use manual text-to-path conversion as primary approach
            console.log('Using manual text-to-path conversion...');
            try {
                convertedSvg = createManualTextPaths(svgString, text, currentFontSize, currentColor, shouldSplitPaths);

                // Add a note about the conversion method
                convertedSvg = convertedSvg.replace('</svg>',
                    `<!-- Generated using manual vector path conversion --></svg>`);

            } catch (secondError) {
                console.log('Manual conversion failed:', secondError.message);

                // Final fallback: return the original SVG with a warning
                convertedSvg = svgString.replace('</svg>',
                    `<!-- Warning: Text-to-path conversion failed, showing original text --></svg>`);
            }
        }

        console.log('Final converted SVG:', convertedSvg);

        // Clean up the session if it exists
        if (session) {
            session.destroy();
        }

        // Display the converted SVG
        svgOutput.innerHTML = convertedSvg;

        // Store the SVG for download
        downloadBtn.onclick = () => downloadSVG(convertedSvg, text);

    } catch (error) {
        console.error('Error converting text to paths:', error);
        svgOutput.innerHTML = `<p class="error">Error converting text to paths: ${error.message}</p>`;
    }
}

// Function to escape HTML characters
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function (m) { return map[m]; });
}

// Function to crop SVG to exact path bounds
function cropSVGToPathBounds(svgString) {
    try {
        // Create a temporary DOM element to parse the SVG
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const svgElement = doc.querySelector('svg');

        if (!svgElement) return svgString;

        // Get all path elements
        const paths = svgElement.querySelectorAll('path');

        if (paths.length === 0) return svgString;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        // Calculate bounding box for all paths
        paths.forEach(path => {
            try {
                // Create a temporary SVG to get accurate bounding box
                const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                tempSvg.style.position = 'absolute';
                tempSvg.style.visibility = 'hidden';
                document.body.appendChild(tempSvg);

                const tempPath = path.cloneNode(true);
                tempSvg.appendChild(tempPath);

                const bbox = tempPath.getBBox();

                minX = Math.min(minX, bbox.x);
                minY = Math.min(minY, bbox.y);
                maxX = Math.max(maxX, bbox.x + bbox.width);
                maxY = Math.max(maxY, bbox.y + bbox.height);

                document.body.removeChild(tempSvg);
            } catch (e) {
                console.warn('Could not get bbox for path:', e);
            }
        });

        // If we couldn't calculate bounds, return original
        if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
            return svgString;
        }

        const width = maxX - minX;
        const height = maxY - minY;

        // Add small padding (2px) to prevent clipping
        const padding = 2;
        const finalWidth = width + (padding * 2);
        const finalHeight = height + (padding * 2);
        const finalMinX = minX - padding;
        const finalMinY = minY - padding;

        // Update SVG attributes
        svgElement.setAttribute('width', Math.ceil(finalWidth));
        svgElement.setAttribute('height', Math.ceil(finalHeight));
        svgElement.setAttribute('viewBox', `${finalMinX} ${finalMinY} ${finalWidth} ${finalHeight}`);

        // Remove any transform attributes that might interfere
        const groups = svgElement.querySelectorAll('g');
        groups.forEach(group => {
            group.removeAttribute('transform');
        });

        return new XMLSerializer().serializeToString(doc);

    } catch (error) {
        console.warn('Error cropping SVG:', error);
        return svgString;
    }
}

// Function to center paths in the viewbox (legacy function, now replaced by cropSVGToPathBounds)
function centerPathsInViewbox(svgString, viewboxWidth, viewboxHeight) {
    // This function is now replaced by cropSVGToPathBounds for better results
    return cropSVGToPathBounds(svgString);
}

// Manual fallback function to create simple letter paths
function createManualTextPaths(svgString, text, fontSize, color, splitPaths) {
    // Simple letter shapes as SVG paths (very basic alphabet)
    const letterPaths = {
        'A': 'M2,20 L10,2 L18,20 M6,14 L14,14',
        'B': 'M2,2 L2,20 M2,2 L14,2 Q18,2 18,7 Q18,11 10,11 M2,11 L14,11 Q18,11 18,16 Q18,20 14,20 L2,20',
        'C': 'M18,7 Q18,2 13,2 L7,2 Q2,2 2,7 L2,15 Q2,20 7,20 L13,20 Q18,20 18,15',
        'D': 'M2,2 L2,20 M2,2 L12,2 Q18,2 18,11 Q18,20 12,20 L2,20',
        'E': 'M2,2 L2,20 M2,2 L18,2 M2,11 L14,11 M2,20 L18,20',
        'F': 'M2,2 L2,20 M2,2 L18,2 M2,11 L14,11',
        'G': 'M18,7 Q18,2 13,2 L7,2 Q2,2 2,7 L2,15 Q2,20 7,20 L13,20 L13,14 L10,14',
        'H': 'M2,2 L2,20 M18,2 L18,20 M2,11 L18,11',
        'I': 'M6,2 L14,2 M10,2 L10,20 M6,20 L14,20',
        'J': 'M6,2 L16,2 M12,2 L12,15 Q12,20 7,20 Q2,20 2,15',
        'K': 'M2,2 L2,20 M18,2 L2,11 M10,11 L18,20',
        'L': 'M2,2 L2,20 M2,20 L18,20',
        'M': 'M2,20 L2,2 L10,10 L18,2 L18,20',
        'N': 'M2,20 L2,2 L18,20 L18,2',
        'O': 'M7,2 L13,2 Q18,2 18,7 L18,15 Q18,20 13,20 L7,20 Q2,20 2,15 L2,7 Q2,2 7,2',
        'P': 'M2,2 L2,20 M2,2 L14,2 Q18,2 18,7 Q18,11 14,11 L2,11',
        'Q': 'M7,2 L13,2 Q18,2 18,7 L18,15 Q18,20 13,20 L7,20 Q2,20 2,15 L2,7 Q2,2 7,2 M13,13 L19,19',
        'R': 'M2,2 L2,20 M2,2 L14,2 Q18,2 18,7 Q18,11 14,11 L2,11 M10,11 L18,20',
        'S': 'M18,7 Q18,2 13,2 L7,2 Q2,2 2,7 Q2,11 7,11 L13,11 Q18,11 18,16 Q18,20 13,20 L7,20 Q2,20 2,15',
        'T': 'M2,2 L18,2 M10,2 L10,20',
        'U': 'M2,2 L2,15 Q2,20 7,20 L13,20 Q18,20 18,15 L18,2',
        'V': 'M2,2 L10,20 L18,2',
        'W': 'M2,2 L6,20 L10,10 L14,20 L18,2',
        'X': 'M2,2 L18,20 M18,2 L2,20',
        'Y': 'M2,2 L10,11 L18,2 M10,11 L10,20',
        'Z': 'M2,2 L18,2 L2,20 L18,20',
        ' ': '',
        // Add lowercase letters with simpler shapes
        'a': 'M15,8 Q15,6 13,6 L7,6 Q5,6 5,8 L5,12 Q5,14 7,14 L13,14 Q15,14 15,12 L15,6 L15,18',
        'b': 'M3,3 L3,18 M3,8 L11,8 Q15,8 15,11 Q15,14 11,14 L3,14',
        'c': 'M15,11 Q15,8 12,8 L8,8 Q5,8 5,11 Q5,14 8,14 L12,14 Q15,14 15,11',
        'd': 'M15,3 L15,18 M15,8 L7,8 Q3,8 3,11 Q3,14 7,14 L15,14',
        'e': 'M15,11 Q15,8 12,8 L8,8 Q5,8 5,11 L15,11 Q15,14 12,14 L8,14 Q5,14 5,11',
        'f': 'M12,3 Q15,3 15,6 M9,3 L9,18 M6,8 L12,8',
        'g': 'M15,8 L15,15 Q15,18 12,18 L8,18 Q5,18 5,15 M15,8 L7,8 Q3,8 3,11 Q3,14 7,14 L15,14',
        'h': 'M3,3 L3,18 M3,8 L11,8 Q15,8 15,11 L15,18',
        'i': 'M9,6 L9,7 M9,8 L9,18 M6,18 L12,18',
        'j': 'M12,6 L12,7 M12,8 L12,15 Q12,18 9,18 Q6,18 6,15',
        'k': 'M3,3 L3,18 M12,8 L3,11 L9,14 L15,18',
        'l': 'M9,3 L9,18 M6,18 L12,18',
        'm': 'M3,8 L3,18 M3,8 L9,8 L9,18 M9,8 L15,8 L15,18',
        'n': 'M3,8 L3,18 M3,8 L11,8 Q15,8 15,11 L15,18',
        'o': 'M8,8 L12,8 Q15,8 15,11 Q15,14 12,14 L8,14 Q5,14 5,11 Q5,8 8,8',
        'p': 'M3,8 L3,18 M3,8 L11,8 Q15,8 15,11 Q15,14 11,14 L3,14',
        'q': 'M15,8 L15,18 M15,8 L7,8 Q3,8 3,11 Q3,14 7,14 L15,14',
        'r': 'M3,8 L3,18 M3,8 L9,8 Q12,8 12,11',
        's': 'M15,11 Q15,8 12,8 L8,8 Q5,8 5,11 L12,11 Q15,11 15,14 Q15,14 12,14 L8,14 Q5,14 5,11',
        't': 'M9,3 L9,14 Q9,17 12,17 M6,8 L12,8',
        'u': 'M3,8 L3,14 Q3,17 6,17 L12,17 Q15,17 15,14 L15,8',
        'v': 'M3,8 L9,17 L15,8',
        'w': 'M3,8 L6,17 L9,11 L12,17 L15,8',
        'x': 'M3,8 L15,17 M15,8 L3,17',
        'y': 'M3,8 L9,14 L15,8 M9,14 L9,18 Q9,20 6,20 Q3,20 3,18',
        'z': 'M3,8 L15,8 L3,17 L15,17'
    };

    // Scale factor based on font size
    const scale = fontSize / 20;

    // Calculate starting position
    const svgWidth = parseInt(svgString.match(/width="(\d+)"/)[1]);
    const svgHeight = parseInt(svgString.match(/height="(\d+)"/)[1]);
    const totalWidth = text.length * 20 * scale;
    const startX = (svgWidth - totalWidth) / 2;
    const startY = svgHeight / 2;

    // Generate paths for each character
    let pathElements = [];
    for (let i = 0; i < text.length; i++) {
        const char = text[i].toUpperCase();
        const pathData = letterPaths[char] || letterPaths[text[i]] || '';

        if (pathData) {
            const x = startX + (i * 20 * scale);
            const y = startY - (10 * scale); // Center vertically

            pathElements.push(`<path d="${pathData}" fill="${color}" transform="translate(${x}, ${y}) scale(${scale})" />`);
        }
    }

    const paths = pathElements.join('');

    // Replace the text element with the generated paths
    return svgString.replace(
        /<text[^>]*>.*?<\/text>/s,
        `<g fill="${color}">${paths}</g>`
    );
}

// Function to download SVG
function downloadSVG(svgContent, filename) {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_vector.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Event listeners
// Auto-generate on text input
textInput.addEventListener('input', async () => {
    const text = textInput.value;
    if (text.trim()) {
        await generateSVG(text);
    } else {
        svgOutput.innerHTML = '';
    }
});

// Generate SVG on Enter key press
textInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const text = textInput.value;
        if (text.trim()) {
            await generateSVG(text);
        }
    }
});

// Update font size display
fontSize.addEventListener('input', () => {
    fontSizeValue.textContent = fontSize.value + 'px';
});

// Auto-generate when settings change
fontSize.addEventListener('change', async () => {
    if (textInput.value.trim()) {
        await generateSVG(textInput.value);
    }
});

// Auto-generate when color changes
colorPicker.addEventListener('change', async () => {
    if (textInput.value.trim()) {
        await generateSVG(textInput.value);
    }
});

// Initial placeholder text
textInput.value = 'Hello World!';