import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import { LARGE_CALENDAR_DATES, SMALL_CALENDAR_DATES, DateCoordinate } from '../templates/monthly-coordinates';

/**
 * Utility to insert dynamic dates into the blank monthly planner template
 */

interface DateMapping {
    date: number; // 1-31
    coordinate: DateCoordinate;
}

/**
 * Generate a monthly planner with dynamic dates
 * @param month - Month number (1-12)
 * @param year - Year (e.g., 2025)
 * @param outputPath - Where to save the generated PDF
 */
export async function generateMonthlyPlanner(
    month: number,
    year: number,
    outputPath: string
): Promise<void> {
    // Load the blank template
    const templatePath = '/Users/aggole/Documents/Goodplanr/templates/monthly_blank.pdf';
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);

    // Get the first page
    const page = pdfDoc.getPage(0);

    // Embed font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Get the number of days in the month
    const daysInMonth = new Date(year, month, 0).getDate();

    // Get the first day of the month (0 = Sunday, 1 = Monday, etc.)
    const firstDay = new Date(year, month - 1, 1).getDay();

    console.log(`Generating planner for ${month}/${year}`);
    console.log(`Days in month: ${daysInMonth}`);
    console.log(`First day: ${firstDay} (0=Sun, 1=Mon, etc.)`);

    // Insert dates into the large calendar
    // This assumes a 7-column grid (Mon-Sun) with 5-6 rows
    // You'll need to map the actual dates based on the calendar layout

    // For now, let's just insert sequential dates into the available positions
    // You can customize this logic based on your specific calendar layout

    const largeCalendarPositions = LARGE_CALENDAR_DATES.slice(0, daysInMonth);

    largeCalendarPositions.forEach((coord, index) => {
        const dateNumber = index + 1;

        // Draw the date number
        page.drawText(dateNumber.toString(), {
            x: coord.x,
            y: coord.y,
            size: 14, // Adjust based on your template
            font: fontBold,
            color: rgb(0, 0, 0),
        });
    });

    console.log(`Inserted ${largeCalendarPositions.length} dates into large calendar`);

    // Insert dates into the small calendar (if needed)
    const smallCalendarPositions = SMALL_CALENDAR_DATES.slice(0, daysInMonth);

    smallCalendarPositions.forEach((coord, index) => {
        const dateNumber = index + 1;

        page.drawText(dateNumber.toString(), {
            x: coord.x,
            y: coord.y,
            size: 9, // Smaller font for mini calendar
            font: font,
            color: rgb(0, 0, 0),
        });
    });

    console.log(`Inserted ${smallCalendarPositions.length} dates into small calendar`);

    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);

    console.log(`✅ Generated planner saved to: ${outputPath}`);
}

/**
 * Example usage
 */
async function example() {
    // Generate a planner for January 2025
    await generateMonthlyPlanner(
        1, // January
        2025,
        '/Users/aggole/Documents/Goodplanr/templates/monthly_generated_jan2025.pdf'
    );
}

// Run example if this file is executed directly
if (require.main === module) {
    example().catch(console.error);
}
