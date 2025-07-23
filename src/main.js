import './style.css'

import Session from 'svg-text-to-path/entries/browser-fontkit.js'



// Get references to elements
const textInput = document.getElementById('textInput');
const svgOutput = document.getElementById('svgOutput');
const fontSize = document.getElementById('fontSize');
const fontSizeValue = document.getElementById('fontSizeValue');
const colorPicker = document.getElementById('colorPicker');
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

        const response = await fetch(`./Roboto-Regular.ttf`);
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

        } catch (error) {
            console.log('svg-text-to-path library failed:', error.message);

            // Clean up first session
            if (session) session.destroy();

            // fallback: return the original SVG with a warning
            convertedSvg = svgString.replace('</svg>',
                `<!-- Warning: Text-to-path conversion failed, showing original text --></svg>`);

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


// Function to download SVG
function downloadSVG(svgContent, filename) {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.svg`;
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

// Auto-generate when color changes (use 'input' for real-time updates)
colorPicker.addEventListener('input', async () => {
    if (textInput.value.trim()) {
        await generateSVG(textInput.value);
    }
});

// Initial placeholder text
textInput.value = 'Hello World!';