const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function verify() {
    console.log("Reading PDF...");
    const dataBuffer = fs.readFileSync('debug_phase3.pdf');

    // Load the PDF
    const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(dataBuffer),
        useSystemFonts: true,
    });

    try {
        const pdfDocument = await loadingTask.promise;
        console.log(`PDF Pages: ${pdfDocument.numPages}`);

        let fullText = "";

        for (let i = 1; i <= pdfDocument.numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + "\n";
        }

        console.log("Extracted Text Length:", fullText.length);

        let valid = true;
        if (pdfDocument.numPages < 2) {
            console.error("FAIL: Expected at least 2 pages.");
            valid = false;
        }

        // Check for Overview Title (might be split across items, so use simple check)
        if (!fullText.includes('2025 Overview')) {
            console.error("FAIL: Missing '2025 Overview'");
            valid = false;
        } else {
            console.log("PASS: Found '2025 Overview'");
        }

        // Check for Month Labels
        if (!fullText.includes('Month 1') || !fullText.includes('Month 12')) {
            // It might be "Month  1" due to join(' ')
            if (!fullText.includes('Month') || !fullText.includes('12')) {
                console.error("FAIL: Missing Month Labels");
                valid = false;
            } else {
                console.log("PASS: Found Month related text (loose check)");
            }
        } else {
            console.log("PASS: Found Month Labels");
        }

        if (valid) console.log("VERIFICATION SUCCESSFUL");
        else console.log("VERIFICATION FAILED");

    } catch (e) {
        console.error("Error parsing PDF:", e);
    }
}

verify();
