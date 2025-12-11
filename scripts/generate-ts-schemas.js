const fs = require('fs');
const path = require('path');

function generateTsSchemas() {
    const schemas = JSON.parse(fs.readFileSync('/Users/aggole/Documents/Goodplanr/templates/page-schemas.json', 'utf8'));
    const outputDir = '/Users/aggole/Documents/Goodplanr/lib/schemas';

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Process Monthly
    const monthlyData = processSchema(schemas.Monthly, 'Monthly');
    fs.writeFileSync(path.join(outputDir, 'monthly.ts'), monthlyData);

    // Process Weekly
    const weeklyData = processSchema(schemas.Weekly, 'Weekly');
    fs.writeFileSync(path.join(outputDir, 'weekly.ts'), weeklyData);

    // Process Daily
    const dailyData = processSchema(schemas.Daily, 'Daily');
    fs.writeFileSync(path.join(outputDir, 'daily.ts'), dailyData);

    console.log('✅ Generated TypeScript schemas in lib/schemas/');
}

function processSchema(data, type) {
    // 1. Extract Date Coordinates (1-31)
    // Filter for numbers 1-31
    const dateItems = data.textItems.filter(item =>
        /^\d{1,2}$/.test(item.text.trim()) &&
        parseInt(item.text) >= 1 &&
        parseInt(item.text) <= 31
    );

    // Sort by Y (descending) then X (ascending)
    // Group by Y to handle slight misalignments
    const sortedDates = dateItems.sort((a, b) => {
        if (Math.abs(a.y - b.y) > 5) return b.y - a.y; // Top to bottom
        return a.x - b.x; // Left to right
    });

    // 2. Extract Navigation Tabs (JAN-DEC)
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const tabItems = data.textItems.filter(item =>
        months.some(m => item.text.toUpperCase().includes(m))
    );

    // Sort tabs by Y (descending)
    const sortedTabs = tabItems.sort((a, b) => b.y - a.y);

    // Generate TypeScript Code
    return `// ${type} Page Schema
// Auto-generated from extracted PDF data

export interface Coordinate {
    x: number;
    y: number;
    width: number;
    height: number;
}

export const ${type.toUpperCase()}_DATES: Coordinate[] = ${JSON.stringify(sortedDates.map(cleanCoord), null, 4)};

export const ${type.toUpperCase()}_TABS: Coordinate[] = ${JSON.stringify(sortedTabs.map(cleanCoord), null, 4)};
`;
}

function cleanCoord(item) {
    return {
        x: parseFloat(item.x.toFixed(2)),
        y: parseFloat(item.y.toFixed(2)),
        width: parseFloat(item.width.toFixed(2)),
        height: parseFloat(item.height.toFixed(2))
    };
}

generateTsSchemas();
