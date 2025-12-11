const fs = require('fs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

/**
 * Simple test to generate a monthly planner with dynamic dates
 */
async function testGeneratePlanner() {
    console.log('='.repeat(80));
    console.log('TESTING MONTHLY PLANNER GENERATION');
    console.log('='.repeat(80));
    console.log();

    // Load the blank template
    const templatePath = '/Users/aggole/Documents/Goodplanr/templates/monthly_blank.pdf';
    console.log(`Loading blank template: ${templatePath}`);

    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);

    // Get the first page
    const page = pdfDoc.getPage(0);
    const { width, height } = page.getSize();
    console.log(`Page size: ${width} x ${height}`);

    // Embed fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    console.log('Fonts embedded');

    // Load coordinate data
    const coordData = JSON.parse(
        fs.readFileSync('/Users/aggole/Documents/Goodplanr/templates/coordinates.json', 'utf8')
    );

    // Get large calendar dates (main calendar)
    const largeCalendarDates = coordData.dateNumbers.filter(d => d.height === 17);
    console.log(`\nFound ${largeCalendarDates.length} positions for large calendar dates`);

    // Insert dates 1-31 (or as many as we have positions for)
    const datesToInsert = Math.min(31, largeCalendarDates.length);
    console.log(`Inserting ${datesToInsert} dates into the calendar...`);

    for (let i = 0; i < datesToInsert; i++) {
        const dateNumber = i + 1;
        const coord = largeCalendarDates[i];

        // Draw the date number
        page.drawText(dateNumber.toString(), {
            x: coord.x,
            y: coord.y,
            size: 14,
            font: fontBold,
            color: rgb(0, 0, 0),
        });

        if (i < 5 || (i + 1) % 5 === 0) {
            console.log(`  Inserted date ${dateNumber} at (${coord.x}, ${coord.y})`);
        }
    }

    // Get small calendar dates (mini calendar)
    const smallCalendarDates = coordData.dateNumbers.filter(d => d.height === 11.05);
    console.log(`\nFound ${smallCalendarDates.length} positions for small calendar dates`);

    // Insert dates into small calendar
    const smallDatesToInsert = Math.min(28, smallCalendarDates.length);
    console.log(`Inserting ${smallDatesToInsert} dates into mini calendar...`);

    for (let i = 0; i < smallDatesToInsert; i++) {
        const dateNumber = i + 1;
        const coord = smallCalendarDates[i];

        page.drawText(dateNumber.toString(), {
            x: coord.x,
            y: coord.y,
            size: 9,
            font: font,
            color: rgb(0, 0, 0),
        });
    }

    // Save the generated PDF
    const outputPath = '/Users/aggole/Documents/Goodplanr/templates/test_generated.pdf';
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);

    console.log();
    console.log('='.repeat(80));
    console.log(`✅ SUCCESS! Generated planner saved to: ${outputPath}`);
    console.log('='.repeat(80));
    console.log();
    console.log('You can now open this PDF to verify the dates were inserted correctly!');
}

testGeneratePlanner().catch(console.error);
