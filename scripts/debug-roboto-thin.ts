
import { generateCustomPlannerPdf } from '../lib/planner';
import * as fs from 'fs';

async function debugPlanner() {
    console.log('Running Debug Script...');
    const config = {
        weekly: [{
            id: 'debug-1',
            type: 'CUSTOM_TEXT',
            label: 'Debug %month% / %day%',
            x: 50,
            y: 50,
            style: {
                font: 'Roboto-Thin',
                fontSize: 24,
                letterSpacing: 0,
                align: 'left' as const
            }
        }],
        monthly: [],
        daily: []
    };

    try {
        const pdfBytes = await generateCustomPlannerPdf({
            year: 2025,
            startDay: 'Monday',
            config: config as any,
            scope: 'weekly',
            limit: 1 // Only 1 month to run fast
        });
        fs.writeFileSync('debug_output.pdf', pdfBytes);
        console.log('Debug PDF created');
    } catch (e) {
        console.error('Debug failed', e);
    }
}

debugPlanner();
