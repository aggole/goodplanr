const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function compareTemplates() {
    // Load monthly_blank_new.pdf
    const blankPath = '/Users/aggole/Documents/Goodplanr/templates/monthly_blank_new.pdf';
    const blankData = new Uint8Array(fs.readFileSync(blankPath));
    const blankTask = pdfjsLib.getDocument(blankData);
    const blankDoc = await blankTask.promise;
    const blankPage = await blankDoc.getPage(1);
    const blankViewport = blankPage.getViewport({ scale: 1.0 });

    console.log('--- monthly_blank_new.pdf ---');
    console.log(`Dimensions: ${blankViewport.width} x ${blankViewport.height}`);

    // Load schema for Page 15
    const schemaPath = '/Users/aggole/Documents/Goodplanr/templates/page-schemas.json';
    const schemas = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const masterDims = schemas.Monthly.dimensions;

    console.log('\n--- Master PDF Page 15 ---');
    console.log(`Dimensions: ${masterDims.width} x ${masterDims.height}`);

    if (Math.abs(blankViewport.width - masterDims.width) < 1 &&
        Math.abs(blankViewport.height - masterDims.height) < 1) {
        console.log('\n✅ Dimensions match!');
    } else {
        console.log('\n❌ Dimensions do NOT match.');
    }
}

compareTemplates().catch(console.error);
