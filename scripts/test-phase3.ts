
import { generateCustomPlannerPdf, PlaceholderConfig } from '../lib/planner';
import * as fs from 'fs';

async function testPhase3() {
    console.log("Generating Year/Overview Planner...");

    const yearlyPlaceholders: PlaceholderConfig[] = [];
    // Generate 12 month grids
    for (let i = 0; i < 12; i++) {
        const row = Math.floor(i / 3); // 4 rows of 3
        const col = i % 3;
        yearlyPlaceholders.push({
            id: `year_grid_${i}`,
            type: 'YEARLY_MONTH_GRID',
            label: (i + 1).toString(), // Month 1-12
            x: 50 + (col * 180),
            y: 100 + (row * 150),
            grid: {
                cols: 7, rows: 6,
                width: 20, height: 15,
                paddingX: 2, paddingY: 2
            },
            style: { font: 'Roboto-Regular', fontSize: 8 }
        });
        // Label
        yearlyPlaceholders.push({
            id: `year_label_${i}`,
            type: 'CUSTOM_TEXT',
            label: 'Month ' + (i + 1),
            x: 50 + (col * 180),
            y: 80 + (row * 150),
            style: { font: 'Roboto-Bold', fontSize: 12 }
        });
    }

    const pdfBuffer = await generateCustomPlannerPdf({
        year: 2025,
        startDay: 'Monday',
        config: {
            yearly: yearlyPlaceholders,
            overview: [
                {
                    id: 'ov_title', type: 'CUSTOM_TEXT', label: '2025 Overview',
                    x: 300, y: 50, style: { font: 'Roboto-Bold', fontSize: 24, align: 'center' }
                }
            ],
            monthly: [],
            weekly: [],
            daily: []
        },
        scope: 'full', // Should generate yearly + overview + empty others
        limit: 1 // Limit just in case
    });

    fs.writeFileSync('debug_phase3.pdf', pdfBuffer);
    console.log("Done! Written to debug_phase3.pdf");
}

testPhase3();
