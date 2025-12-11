const fs = require('fs');
const path = require('path');

// Polyfills for pdfjs-dist in Node environment
if (typeof Promise.withResolvers === 'undefined') {
    // pdfjs-dist v4+ might use Promise.withResolvers
    Promise.withResolvers = function () {
        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve, reject };
    };
}

// Minimal DOM polyfills for pdfjs-dist
global.DOMMatrix = class DOMMatrix {
    constructor() { this.m = [1, 0, 0, 1, 0, 0]; }
};
global.Path2D = class Path2D { };
global.ImageData = class ImageData { };
global.CanvasRenderingContext2D = class CanvasRenderingContext2D { };
global.document = {
    createElement: (name) => {
        if (name === 'canvas') {
            return {
                getContext: () => new CanvasRenderingContext2D(),
                height: 0,
                width: 0
            };
        }
        return {};
    }
};

// Try to require pdfjs-dist
// In v5, it might need to be imported via dynamic import if it's ESM only.
// Let's try dynamic import in an async context.

async function run() {
    let pdfjsLib;
    try {
        pdfjsLib = await import('pdfjs-dist');
    } catch (e) {
        // Fallback
        pdfjsLib = require('pdfjs-dist');
    }

    // Set worker? In Node, we might not need it for text, or we use the generic worker.
    // pdfjsLib.GlobalWorkerOptions.workerSrc = ... 
    // Usually pdfjs-dist/build/pdf.worker.min.mjs
    // But let's try without setting it first (it might warn or fail).

    // Load Config
    const configPath = path.join(process.cwd(), 'config', 'planner_settings.json');
    if (!fs.existsSync(configPath)) {
        console.error('Config file not found');
        process.exit(1);
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const monthlyPlaceholders = config.placeholders?.monthly || [];

    const pdfPath = path.join(process.cwd(), 'templates', 'generated', 'monthly-generated.pdf');
    if (!fs.existsSync(pdfPath)) {
        console.error('Generated PDF not found');
        process.exit(1);
    }

    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = pdfjsLib.getDocument(data);
    const doc = await loadingTask.promise;
    const page = await doc.getPage(1);

    const viewport = page.getViewport({ scale: 1.0 });
    const { width, height } = viewport;
    const uiScale = width / 1000.0;

    console.log(`PDF Dimensions: ${width}x${height}`);
    console.log(`UI Scale: ${uiScale}`);
    console.log('\n--- Analysis ---');

    const textContent = await page.getTextContent();
    const items = textContent.items;

    // Check Month Label
    const monthPh = monthlyPlaceholders.find(p => p.type === 'MONTH_LABEL');
    if (monthPh) {
        console.log(`Placeholder [MONTH_LABEL]:`);
        console.log(`  Config (UI): x=${monthPh.x}, y=${monthPh.y}`);

        const fontSize = monthPh.style?.fontSize || 24;
        const expectedBaselineY = height - (monthPh.y * uiScale) - (fontSize * uiScale * 0.72);

        console.log(`  Expected Baseline Y: ${expectedBaselineY.toFixed(2)}`);

        const relevantItems = items.filter(i => i.str.toUpperCase().includes('JAN') || i.str.toUpperCase().includes('FEB'));
        if (relevantItems.length > 0) {
            relevantItems.forEach(item => {
                const actualX = item.transform[4];
                const actualY = item.transform[5];
                console.log(`  Found Text "${item.str}": x=${actualX.toFixed(2)}, y=${actualY.toFixed(2)}`);
                console.log(`  Delta Y (Expected - Actual): ${(expectedBaselineY - actualY).toFixed(2)}`);
            });
        } else {
            console.log('  Text not found.');
        }
    }
}

run().catch(console.error);
