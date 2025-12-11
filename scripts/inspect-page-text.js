const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function inspectPageText() {
    const pdfPath = '/Users/aggole/Documents/Goodplanr/templates/Classic-2025-MS-WV-DG-M.pdf';
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = pdfjsLib.getDocument(data);
    const doc = await loadingTask.promise;

    const pagesToInspect = [2, 15, 50, 100]; // Sample likely Monthly, Weekly, Daily

    for (const pageNum of pagesToInspect) {
        const page = await doc.getPage(pageNum);
        const textContent = await page.getTextContent();

        console.log(`\n--- Page ${pageNum} Raw Text ---`);
        console.log(textContent.items.map(item => item.str).join('|'));
    }
}

inspectPageText().catch(console.error);
