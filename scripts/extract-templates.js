const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function extractTemplates() {
    const pdfPath = '/Users/aggole/Documents/Goodplanr/templates/Classic-2025-MS-WV-DG-M.pdf';
    const pdfBytes = fs.readFileSync(pdfPath);
    const srcDoc = await PDFDocument.load(pdfBytes);

    // Define pages to extract (1-based index)
    const templates = [
        { name: 'monthly_base.pdf', page: 15 }, // August (Monthly)
        { name: 'weekly_base.pdf', page: 50 },  // Week 25 (Weekly)
        { name: 'daily_base.pdf', page: 100 }   // Dec 18 (Daily)
    ];

    console.log('Extracting base templates...');

    for (const t of templates) {
        const newDoc = await PDFDocument.create();
        const [copiedPage] = await newDoc.copyPages(srcDoc, [t.page - 1]); // 0-based index
        newDoc.addPage(copiedPage);

        const outputPath = `/Users/aggole/Documents/Goodplanr/templates/${t.name}`;
        const bytes = await newDoc.save();
        fs.writeFileSync(outputPath, bytes);

        console.log(`✅ Extracted ${t.name} from page ${t.page}`);
    }
}

extractTemplates().catch(console.error);
