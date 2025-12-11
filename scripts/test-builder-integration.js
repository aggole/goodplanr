
const fs = require('fs');
// Simulate the Builder UI payload for a Yearly Planner
async function testBuilderIntegration() {
    console.log("Simulating Builder Generation...");

    // Construct payload matching builder.tsx structure
    const payload = {
        year: 2025,
        startDay: 'Monday',
        config: {
            yearly: [
                {
                    id: 'nav_tabs', type: 'NAVIGATION_TABS', label: 'Tabs', x: 50, y: 50,
                    grid: { cols: 1, rows: 12, width: 20, height: 20, paddingX: 0, paddingY: 5 },
                    style: { font: 'Roboto-Regular', fontSize: 10 }
                },
                // 12 Months
                ...Array.from({ length: 12 }, (_, i) => ({
                    id: `month_grid_${i}`, type: 'YEARLY_MONTH_GRID', label: (i + 1).toString(),
                    x: 100 + (i % 3) * 150, y: 100 + Math.floor(i / 3) * 120,
                    grid: { cols: 7, rows: 6, width: 10, height: 10, paddingX: 1, paddingY: 1 },
                    style: { font: 'Roboto-Regular', fontSize: 8 }
                }))
            ],
            monthly: [],
            weekly: [],
            daily: []
        },
        scope: 'year', // Generating just year page to verify tab
        limit: 1
    };

    // We can't call the API endpoint directly easily without running Next.js server context methods or mocking.
    // However, we can use the library function directly like in test-phase3.ts, 
    // but here we want to verify the *Builder's* logic of constructing the payload?
    // The builder just passes `scope: 'year'` and the config.
    // So if `generateCustomPlannerPdf` works (verified in Phase 3), and Builder constructs this, it should work.

    // Let's re-verify generateCustomPlannerPdf accepts this specific structure (especially 'yearly' key which we added).

    const { generateCustomPlannerPdf } = require('../lib/planner');

    try {
        const buffer = await generateCustomPlannerPdf(payload);
        fs.writeFileSync('debug_builder_sim.pdf', buffer);
        console.log("Success! Builder simulation PDF generated at debug_builder_sim.pdf");
    } catch (e) {
        console.error("Builder Simulation Failed:", e);
    }
}

testBuilderIntegration();
