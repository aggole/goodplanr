const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function extractCoordinates(pdfPath) {
    const dataBuffer = fs.readFileSync(pdfPath);

    // Load the PDF
    const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(dataBuffer),
        useSystemFonts: true,
    });

    const pdfDocument = await loadingTask.promise;
    console.log(`PDF loaded: ${pdfDocument.numPages} pages\n`);

    const allTextItems = [];

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });

        console.log(`\n=== Page ${pageNum} ===`);
        console.log(`Viewport: ${viewport.width} x ${viewport.height}`);
        console.log(`Text items found: ${textContent.items.length}\n`);

        textContent.items.forEach((item, index) => {
            const text = item.str.trim();
            if (text) {
                const transform = item.transform;
                const x = transform[4];
                const y = transform[5];

                // Store the item
                allTextItems.push({
                    page: pageNum,
                    text: text,
                    x: Math.round(x * 100) / 100,
                    y: Math.round(y * 100) / 100,
                    width: Math.round(item.width * 100) / 100,
                    height: Math.round(item.height * 100) / 100,
                });

                // Print first 50 items per page for inspection
                if (index < 50) {
                    console.log(`[${index}] "${text}" at (${Math.round(x)}, ${Math.round(y)})`);
                }
            }
        });

        if (textContent.items.length > 50) {
            console.log(`... and ${textContent.items.length - 50} more items`);
        }
    }

    // Filter for date-like numbers (1-31)
    const dateNumbers = allTextItems.filter(item => {
        const num = parseInt(item.text);
        return !isNaN(num) && num >= 1 && num <= 31 && item.text === num.toString();
    });

    console.log(`\n\n=== DATE NUMBERS FOUND (1-31) ===`);
    console.log(`Total: ${dateNumbers.length} items\n`);
    dateNumbers.forEach(item => {
        console.log(`Page ${item.page}: "${item.text}" at (${item.x}, ${item.y})`);
    });

    // Save all data to JSON
    const output = {
        metadata: {
            totalPages: pdfDocument.numPages,
            totalTextItems: allTextItems.length,
            dateNumbersFound: dateNumbers.length,
        },
        allTextItems: allTextItems,
        dateNumbers: dateNumbers,
    };

    const outputPath = '/Users/aggole/Documents/Goodplanr/templates/coordinates.json';
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n✅ Saved all coordinates to: ${outputPath}`);
}

const pdfPath = process.argv[2] || '/Users/aggole/Documents/Goodplanr/templates/monthly_filled.pdf';
extractCoordinates(pdfPath).catch(console.error);
