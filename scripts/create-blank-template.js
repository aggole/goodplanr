const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');

async function createBlankTemplate() {
    // Load the filled PDF
    const filledPdfPath = '/Users/aggole/Documents/Goodplanr/templates/monthly_filled.pdf';
    const existingPdfBytes = fs.readFileSync(filledPdfPath);

    // Load the PDF
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    console.log('Loaded filled PDF');
    console.log(`Pages: ${pdfDoc.getPageCount()}`);

    // Load the coordinate data to know what to remove
    const coordData = JSON.parse(
        fs.readFileSync('/Users/aggole/Documents/Goodplanr/templates/coordinates.json', 'utf8')
    );

    const page = pdfDoc.getPage(0);
    const { width, height } = page.getSize();

    console.log(`Page size: ${width} x ${height}`);
    console.log('\nRemoving dynamic date numbers by covering them with white rectangles...');

    // Get all date numbers to remove (1-31)
    // BUT exclude the large white boxes and small week indicators
    const datesToRemove = coordData.dateNumbers.filter(item => {
        // Exclude large white boxes (height = 110)
        if (item.height === 110) {
            console.log(`  Skipping large white box: "${item.text}" at (${item.x}, ${item.y})`);
            return false;
        }
        // Exclude small week indicators (height = 10, x around 264)
        if (item.height === 10 && item.x > 260 && item.x < 270) {
            console.log(`  Skipping week indicator: "${item.text}" at (${item.x}, ${item.y})`);
            return false;
        }
        return true;
    });

    console.log(`Found ${datesToRemove.length} date numbers to remove (after filtering)`);

    // Cover each date number with a white rectangle
    datesToRemove.forEach((dateItem, index) => {
        // Add some padding to ensure complete coverage
        const padding = 2;
        const x = dateItem.x - padding;
        const y = dateItem.y - padding;
        const w = dateItem.width + (padding * 2);
        const h = dateItem.height + (padding * 2);

        // Draw white rectangle over the date
        page.drawRectangle({
            x: x,
            y: y,
            width: w,
            height: h,
            color: rgb(1, 1, 1), // White
        });

        if (index < 10 || index % 10 === 0) {
            console.log(`  [${index + 1}/${datesToRemove.length}] Removed "${dateItem.text}" at (${dateItem.x}, ${dateItem.y})`);
        }
    });

    console.log(`\n✅ Removed all ${datesToRemove.length} date numbers`);

    // Save the blank template
    const blankPdfBytes = await pdfDoc.save();
    const outputPath = '/Users/aggole/Documents/Goodplanr/templates/monthly_blank.pdf';
    fs.writeFileSync(outputPath, blankPdfBytes);

    console.log(`\n✅ Blank template saved to: ${outputPath}`);
    console.log('\nThe blank template is ready to use for dynamic date insertion!');
}

createBlankTemplate().catch(console.error);
