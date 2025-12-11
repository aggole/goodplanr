
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import { CustomPlannerOptions, generateCustomPlannerPdf, PlaceholderConfig } from '../lib/planner';

// Mock context for testing
const mockConfig: CustomPlannerOptions = {
    year: 2025,
    startDay: 'Monday',
    config: {
        yearly: [],
        monthly: [],
        weekly: [],
        daily: [],
        mini: [],
        global: [
            // Test Global Nav Tab (simplified as a rect or text)
            {
                id: 'g1', type: 'CUSTOM_TEXT', label: 'GLOBAL_MASTER', x: 50, y: 50,
                style: { font: 'Roboto-Bold', fontSize: 20, color: '#FF0000' }
            },
            // Test Link Rect to Yearly
            {
                id: 'g2', type: 'LINK_RECT', label: 'yearly', x: 100, y: 50,
                grid: { width: 50, height: 20, cols: 1, rows: 1, paddingX: 0, paddingY: 0 }
            }
        ]
    },
    extras: {
        grid: { count: 2 },
        dot: { count: 1 },
        line: { count: 1 },
        blank: { count: 1 }
    },
    scope: 'full', // Generates all scopes + extras
    limit: 1 // Limit main pages to 1 for speed
};

async function test() {
    console.log('Generating Phase 6 Test Planner...');
    const pdfBytes = await generateCustomPlannerPdf(mockConfig);
    fs.writeFileSync('debug_phase6.pdf', pdfBytes);
    console.log('Done! Written to debug_phase6.pdf');

    // Simple check: Load and count pages
    const doc = await PDFDocument.load(pdfBytes);
    console.log(`Total Pages: ${doc.getPageCount()}`);
    // Expected:
    // Yearly: 1
    // Overview: 1
    // Monthly: 1 (limit=1) -> 12 if full? No, options.limit applies to loops. 
    // Wait, monthly loop uses min(12, limit). So 1.
    // Weekly: 1 (limit=1)
    // Daily: 1 (limit=1)
    // Extras: 2+1+1+1 = 5
    // Total approx: 1+1+1+1+1 + 5 = 10 pages.
}

test().catch(console.error);
