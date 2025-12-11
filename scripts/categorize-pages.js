const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function categorizePages() {
    const pdfPath = '/Users/aggole/Documents/Goodplanr/templates/Classic-2025-MS-WV-DG-M.pdf';
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = pdfjsLib.getDocument(data);
    const doc = await loadingTask.promise;

    console.log(`Analyzing ${doc.numPages} pages...`);

    const pageTypes = {
        cover: [],
        yearOverview: [],
        monthly: [],
        weekly: [],
        daily: [],
        notes: [],
        other: []
    };

    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items.map(item => item.str).join('|');

        if (i === 1) {
            pageTypes.cover.push(i);
        } else if (text.includes('Year Overview') || (text.includes('2025') && text.includes('Calendar') && !text.includes('WEEK'))) {
            pageTypes.yearOverview.push(i);
        } else if (text.includes('+ DAILY EVENT')) {
            pageTypes.daily.push(i);
        } else if (text.includes('WEEK') && (text.includes('Priorities') || text.includes('MON') && text.includes('SUN'))) {
            // Weekly pages usually have a week number and days, but not "+ DAILY EVENT"
            pageTypes.weekly.push(i);
        } else if (hasMonthName(text) && text.includes('2025') && !text.includes('WEEK')) {
            // Monthly pages have month name and year, but no week number
            pageTypes.monthly.push(i);
        } else {
            pageTypes.other.push(i);
        }

        if (i % 50 === 0) console.log(`Processed ${i} pages...`);
    }

    console.log('\n--- Page Categorization Results ---');
    console.log(`Cover: ${pageTypes.cover.length} pages (${ranges(pageTypes.cover)})`);
    console.log(`Year Overview: ${pageTypes.yearOverview.length} pages (${ranges(pageTypes.yearOverview)})`);
    console.log(`Monthly: ${pageTypes.monthly.length} pages (${ranges(pageTypes.monthly)})`);
    console.log(`Weekly: ${pageTypes.weekly.length} pages (${ranges(pageTypes.weekly)})`);
    console.log(`Daily: ${pageTypes.daily.length} pages (${ranges(pageTypes.daily)})`);
    console.log(`Other: ${pageTypes.other.length} pages (${ranges(pageTypes.other)})`);
}

function hasMonthName(text) {
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    // Check for uppercase month names as seen in raw text
    return months.some(m => text.includes(m));
}

function ranges(nums) {
    if (nums.length === 0) return 'None';
    let ranges = [];
    let start = nums[0];
    let prev = nums[0];

    for (let i = 1; i < nums.length; i++) {
        if (nums[i] !== prev + 1) {
            ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
            start = nums[i];
        }
        prev = nums[i];
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    return ranges.join(', ');
}

categorizePages().catch(console.error);
