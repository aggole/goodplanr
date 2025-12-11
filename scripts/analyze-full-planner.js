const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function analyzePdf() {
    const pdfPath = '/Users/aggole/Documents/Goodplanr/templates/Classic-2025-MS-WV-DG-M.pdf';
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = pdfjsLib.getDocument(data);
    const doc = await loadingTask.promise;

    console.log(`Total Pages: ${doc.numPages}`);

    // Analyze a few key pages to understand structure
    // Page 1: Likely Cover or Yearly Overview
    // Page 10: Likely Monthly
    // Page 50: Likely Weekly or Daily
    const pagesToAnalyze = [1, 2, 3, 10, 50];

    for (const pageNum of pagesToAnalyze) {
        if (pageNum > doc.numPages) continue;

        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        const textContent = await page.getTextContent();
        const annotations = await page.getAnnotations();

        console.log(`\n--- Page ${pageNum} ---`);
        console.log(`Dimensions: ${viewport.width} x ${viewport.height}`);
        console.log(`Text Items: ${textContent.items.length}`);
        console.log(`Annotations (Links): ${annotations.length}`);

        // Print first few text items to identify page type
        console.log('Sample Text:');
        textContent.items.slice(0, 10).forEach(item => {
            console.log(`  "${item.str}" at (${Math.round(item.transform[4])}, ${Math.round(item.transform[5])})`);
        });

        // Analyze links
        if (annotations.length > 0) {
            console.log('Sample Links:');
            annotations.slice(0, 5).forEach(ann => {
                if (ann.subtype === 'Link') {
                    console.log(`  Link to: ${ann.dest ? ann.dest : 'Action'} at [${ann.rect.map(Math.round).join(', ')}]`);
                }
            });
        }
    }
}

analyzePdf().catch(console.error);
