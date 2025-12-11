const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function extractPageSchema() {
    const pdfPath = '/Users/aggole/Documents/Goodplanr/templates/Classic-2025-MS-WV-DG-M.pdf';
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = pdfjsLib.getDocument(data);
    const doc = await loadingTask.promise;

    const pagesToExtract = [
        { type: 'Monthly', pageNum: 15 },
        { type: 'Weekly', pageNum: 50 },
        { type: 'Daily', pageNum: 100 }
    ];

    const schemas = {};

    for (const { type, pageNum } of pagesToExtract) {
        console.log(`Extracting schema for ${type} (Page ${pageNum})...`);
        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        const textContent = await page.getTextContent();
        const annotations = await page.getAnnotations();

        schemas[type] = {
            dimensions: { width: viewport.width, height: viewport.height },
            textItems: textContent.items.map(item => ({
                text: item.str,
                x: item.transform[4],
                y: item.transform[5],
                width: item.width,
                height: item.height
            })),
            links: annotations
                .filter(ann => ann.subtype === 'Link')
                .map(ann => ({
                    rect: ann.rect, // [x1, y1, x2, y2]
                    dest: ann.dest, // Destination (often null for named actions, or array for explicit dest)
                    // For internal links, dest is usually an array [ref, name, ...]
                    // We need to resolve where this points to.
                }))
        };
    }

    const outputPath = '/Users/aggole/Documents/Goodplanr/templates/page-schemas.json';
    fs.writeFileSync(outputPath, JSON.stringify(schemas, null, 2));
    console.log(`✅ Schemas saved to ${outputPath}`);
}

extractPageSchema().catch(console.error);
