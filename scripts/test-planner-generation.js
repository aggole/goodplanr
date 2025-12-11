// Test script to generate a sample planner with the new template
const { generatePlannerPdf } = require('../lib/planner');
const fs = require('fs');
const path = require('path');

async function testPlannerGeneration() {
    console.log('='.repeat(80));
    console.log('TESTING TEMPLATE-BASED PLANNER GENERATION');
    console.log('='.repeat(80));
    console.log();

    try {
        console.log('Generating planner for 2025 (Monday start)...');
        const pdfBytes = await generatePlannerPdf({
            year: 2025,
            startDay: 'Monday'
        });

        const outputPath = path.join(__dirname, '..', 'templates', 'test_planner_2025.pdf');
        fs.writeFileSync(outputPath, pdfBytes);

        const sizeKB = (pdfBytes.length / 1024).toFixed(2);
        console.log();
        console.log('='.repeat(80));
        console.log(`✅ SUCCESS! Planner generated successfully`);
        console.log(`   File: ${outputPath}`);
        console.log(`   Size: ${sizeKB} KB`);
        console.log('='.repeat(80));
        console.log();
        console.log('Please open the PDF to verify:');
        console.log('  1. Monthly pages use the template design');
        console.log('  2. Dates are positioned correctly');
        console.log('  3. January 2025 starts on Wednesday (date 1 should be in Wed column)');
        console.log('  4. Navigation tabs work');
        console.log('  5. Clicking dates navigates to daily pages');
        console.log();
        console.log(`To open: open "${outputPath}"`);

    } catch (error) {
        console.error('❌ ERROR generating planner:');
        console.error(error);
        process.exit(1);
    }
}

testPlannerGeneration();
