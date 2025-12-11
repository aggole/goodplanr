const fs = require('fs');

// Load the extracted coordinates
const data = JSON.parse(fs.readFileSync('/Users/aggole/Documents/Goodplanr/templates/coordinates.json', 'utf8'));

console.log('='.repeat(80));
console.log('PDF COORDINATE ANALYSIS - MONTHLY PLANNER');
console.log('='.repeat(80));
console.log();

console.log('📊 SUMMARY:');
console.log(`   Total Pages: ${data.metadata.totalPages}`);
console.log(`   Total Text Items: ${data.metadata.totalTextItems}`);
console.log(`   Date Numbers Found (1-31): ${data.metadata.dateNumbersFound}`);
console.log();

// Analyze the date numbers
const dateNumbers = data.dateNumbers;

// Group by position patterns
const largeCalendarDates = dateNumbers.filter(d => d.height === 17);
const smallCalendarDates = dateNumbers.filter(d => d.height === 11.05);
const otherDates = dateNumbers.filter(d => d.height !== 17 && d.height !== 11.05);

console.log('📅 DATE GROUPS BY SIZE:');
console.log();

console.log('1. LARGE CALENDAR (Main Monthly View):');
console.log(`   Count: ${largeCalendarDates.length} dates`);
console.log(`   Height: 17px`);
console.log(`   X Range: ${Math.min(...largeCalendarDates.map(d => d.x))} - ${Math.max(...largeCalendarDates.map(d => d.x))}`);
console.log(`   Y Range: ${Math.min(...largeCalendarDates.map(d => d.y))} - ${Math.max(...largeCalendarDates.map(d => d.y))}`);
console.log(`   Sample dates:`);
largeCalendarDates.slice(0, 5).forEach(d => {
    console.log(`      "${d.text}" at (${d.x}, ${d.y})`);
});
console.log();

console.log('2. SMALL CALENDAR (Mini Calendar):');
console.log(`   Count: ${smallCalendarDates.length} dates`);
console.log(`   Height: 11.05px`);
console.log(`   X Range: ${Math.min(...smallCalendarDates.map(d => d.x))} - ${Math.max(...smallCalendarDates.map(d => d.x))}`);
console.log(`   Y Range: ${Math.min(...smallCalendarDates.map(d => d.y))} - ${Math.max(...smallCalendarDates.map(d => d.y))}`);
console.log(`   Sample dates:`);
smallCalendarDates.slice(0, 5).forEach(d => {
    console.log(`      "${d.text}" at (${d.x}, ${d.y})`);
});
console.log();

if (otherDates.length > 0) {
    console.log('3. OTHER DATE ELEMENTS:');
    console.log(`   Count: ${otherDates.length} dates`);
    otherDates.forEach(d => {
        console.log(`      "${d.text}" at (${d.x}, ${d.y}) - height: ${d.height}`);
    });
    console.log();
}

// Find month names
const monthNames = data.allTextItems.filter(item =>
    ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].includes(item.text)
);

console.log('📆 MONTH LABELS:');
console.log(`   Count: ${monthNames.length} month labels found`);
monthNames.slice(0, 5).forEach(m => {
    console.log(`      "${m.text}" at (${m.x}, ${m.y})`);
});
console.log();

// Find day names
const dayNames = data.allTextItems.filter(item =>
    ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].includes(item.text)
);

console.log('📅 DAY OF WEEK LABELS:');
console.log(`   Count: ${dayNames.length} day labels found`);
dayNames.forEach(d => {
    console.log(`      "${d.text}" at (${d.x}, ${d.y})`);
});
console.log();

// Generate TypeScript coordinate mapping
console.log('='.repeat(80));
console.log('GENERATING TYPESCRIPT COORDINATE MAP...');
console.log('='.repeat(80));
console.log();

const tsContent = `// Auto-generated coordinate mapping from monthly_filled.pdf
// Generated on: ${new Date().toISOString()}

export interface Coordinate {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DateCoordinate extends Coordinate {
  text: string;
  page: number;
}

// PDF Page dimensions
export const PAGE_DIMENSIONS = {
  width: 1366,
  height: 968,
};

// Large calendar dates (main monthly view)
export const LARGE_CALENDAR_DATES: DateCoordinate[] = ${JSON.stringify(largeCalendarDates, null, 2)};

// Small calendar dates (mini calendar)
export const SMALL_CALENDAR_DATES: DateCoordinate[] = ${JSON.stringify(smallCalendarDates, null, 2)};

// Month labels
export const MONTH_LABELS: DateCoordinate[] = ${JSON.stringify(monthNames, null, 2)};

// Day of week labels
export const DAY_LABELS: DateCoordinate[] = ${JSON.stringify(dayNames, null, 2)};

// All text items (for reference)
export const ALL_TEXT_ITEMS: DateCoordinate[] = ${JSON.stringify(data.allTextItems, null, 2)};
`;

const tsOutputPath = '/Users/aggole/Documents/Goodplanr/templates/monthly-coordinates.ts';
fs.writeFileSync(tsOutputPath, tsContent);
console.log(`✅ TypeScript coordinate map saved to: ${tsOutputPath}`);
console.log();

console.log('='.repeat(80));
console.log('NEXT STEPS:');
console.log('='.repeat(80));
console.log('1. Review the coordinate data in monthly-coordinates.ts');
console.log('2. Use these coordinates to position dynamic dates in your PDF generation');
console.log('3. You can now map actual dates to these coordinate positions');
console.log();
