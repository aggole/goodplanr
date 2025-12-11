const fs = require('fs');

function analyzeSchema() {
    const schemaPath = '/Users/aggole/Documents/Goodplanr/templates/page-schemas.json';
    const schemas = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

    console.log('--- Schema Analysis ---');

    for (const [type, data] of Object.entries(schemas)) {
        console.log(`\nType: ${type}`);
        console.log(`Dimensions: ${data.dimensions.width} x ${data.dimensions.height}`);
        console.log(`Total Text Items: ${data.textItems.length}`);
        console.log(`Total Links: ${data.links.length}`);

        // Find date numbers (1-31)
        const dateItems = data.textItems.filter(item =>
            !isNaN(parseInt(item.text)) &&
            parseInt(item.text) >= 1 &&
            parseInt(item.text) <= 31 &&
            item.text.trim().length <= 2
        );
        console.log(`Potential Date Numbers: ${dateItems.length}`);
        if (dateItems.length > 0) {
            console.log('Sample Date Locations:');
            dateItems.slice(0, 5).forEach(d =>
                console.log(`  "${d.text}" at (${Math.round(d.x)}, ${Math.round(d.y)})`)
            );
        }

        // Find Month Links/Tabs
        const monthLinks = data.textItems.filter(item =>
            ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].includes(item.text)
        );
        console.log(`Month Tabs Found: ${monthLinks.length}`);
        if (monthLinks.length > 0) {
            console.log('Sample Month Tab Locations:');
            monthLinks.slice(0, 5).forEach(m =>
                console.log(`  "${m.text}" at (${Math.round(m.x)}, ${Math.round(m.y)})`)
            );
        }
    }
}

analyzeSchema();
