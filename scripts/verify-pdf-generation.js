const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function verifyPdfGeneration() {
    const pdfPath = '/Users/aggole/Documents/Goodplanr/templates/Classic-2025-MS-WV-DG-M.pdf';
    const pdfBytes = fs.readFileSync(pdfPath);

    console.log('Loading Master PDF...');
    const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    console.log('Creating new PDF...');
    const newDoc = await PDFDocument.create();

    // Pages to copy: 15 (Monthly), 50 (Weekly), 100 (Daily)
    // 0-based indices: 14, 49, 99
    const pagesToCopy = [14, 49, 99];

    console.log('Copying pages...');
    const copiedPages = await newDoc.copyPages(srcDoc, pagesToCopy);

    copiedPages.forEach(page => newDoc.addPage(page));

    console.log('Saving new PDF...');
    const outputBytes = await newDoc.save();

    const outputPath = '/Users/aggole/Documents/Goodplanr/templates/test_copy_verification.pdf';
    fs.writeFileSync(outputPath, outputBytes);

    console.log(`✅ Success! Saved to ${outputPath}`);
    console.log(`Size: ${(outputBytes.length / 1024 / 1024).toFixed(2)} MB`);
}

verifyPdfGeneration().catch(console.error);
