const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');

async function createBlankTemplates() {
    const schemas = JSON.parse(fs.readFileSync('/Users/aggole/Documents/Goodplanr/templates/page-schemas.json', 'utf8'));

    const templates = [
        { type: 'Monthly', input: 'monthly_base.pdf', output: 'monthly_blank_final.pdf' },
        { type: 'Weekly', input: 'weekly_base.pdf', output: 'weekly_blank_final.pdf' },
        { type: 'Daily', input: 'daily_base.pdf', output: 'daily_blank_final.pdf' }
    ];

    for (const t of templates) {
        console.log(`Processing ${t.type} template...`);
        const pdfBytes = fs.readFileSync(`/Users/aggole/Documents/Goodplanr/templates/${t.input}`);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const page = pdfDoc.getPage(0);
        const schema = schemas[t.type];

        // Identify items to remove based on type
        const itemsToRemove = schema.textItems.filter(item => {
            const text = item.text.trim();

            // Common: Remove year '2025' if it's dynamic (usually it is static for a 2025 planner, but let's keep it static for now)
            // Actually, for a 2025 planner, '2025' is static.

            if (t.type === 'Monthly') {
                // Remove dates 1-31
                // Also remove small calendar dates if they exist (usually smaller font or specific area)
                // For now, let's remove all numbers 1-31 that are not part of the year
                return isDateNumber(text);
            }

            if (t.type === 'Weekly') {
                // Remove dates 1-31
                // Remove "Week X"
                if (isDateNumber(text)) return true;
                if (text.toUpperCase().includes('WEEK') && /\d/.test(text)) return true;
                // Remove month name if it's dynamic (e.g. "JUNE")
                if (isMonthName(text)) return true;
                return false;
            }

            if (t.type === 'Daily') {
                // Remove date number
                if (isDateNumber(text)) return true;
                // Remove day name (Monday, Tuesday...)
                if (isDayName(text)) return true;
                // Remove "Week X"
                if (text.toUpperCase().includes('WEEK') && /\d/.test(text)) return true;
                // Remove month name
                if (isMonthName(text)) return true;
                return false;
            }

            return false;
        });

        console.log(`  Found ${itemsToRemove.length} items to remove.`);

        // Cover with white rectangles
        itemsToRemove.forEach(item => {
            // Add padding
            const padding = 2;
            page.drawRectangle({
                x: item.x - padding,
                y: item.y - padding,
                width: item.width + (padding * 2),
                height: item.height + (padding * 2),
                color: rgb(1, 1, 1)
            });
        });

        const blankBytes = await pdfDoc.save();
        fs.writeFileSync(`/Users/aggole/Documents/Goodplanr/templates/${t.output}`, blankBytes);
        console.log(`  ✅ Saved ${t.output}`);
    }
}

function isDateNumber(text) {
    return /^\d{1,2}$/.test(text) && parseInt(text) >= 1 && parseInt(text) <= 31;
}

function isMonthName(text) {
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    return months.includes(text.toUpperCase());
}

function isDayName(text) {
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    return days.includes(text.toUpperCase());
}

createBlankTemplates().catch(console.error);
