
import type { NextApiRequest, NextApiResponse } from 'next';
import { generateCustomPlannerPdf, CustomPlannerOptions } from '../../lib/planner';
import { compressPdfWithILovePDF } from '../../utils/compress-pdf';
import fs from 'fs';
import path from 'path';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        res.status(405).send({ message: 'Only POST requests allowed' });
        return;
    }

    const { year, startDay, weeklyLayout, dailyLayout, holidaySettings, enableCompression } = req.body;

    try {
        // Load the saved config for Classic planner (if exists)
        let config: CustomPlannerOptions['config'] = {
            monthly: [],
            weekly: [],
            daily: [],
            global: []
        };

        const configDir = path.join(process.cwd(), 'config');
        const savedConfigPath = path.join(configDir, 'classic_config.json');
        if (fs.existsSync(savedConfigPath)) {
            const savedData = JSON.parse(fs.readFileSync(savedConfigPath, 'utf8'));
            if (savedData.placeholders) {
                config = {
                    ...config,
                    ...savedData.placeholders
                };
            }
        }

        const options: CustomPlannerOptions = {
            year: parseInt(year),
            startDay: startDay || 'Monday',
            weeklyLayout: weeklyLayout || 'vertical', // Default to vertical
            dailyLayout: dailyLayout || 'grid', // Default to grid
            config,
            scope: 'full',
            holidaySettings,
            extras: {
                grid: { count: 1 },
                dot: { count: 1 },
                line: { count: 1 },
                blank: { count: 1 }
            }
        };

        console.log('=== PDF GENERATION START ===');
        const pdfBytes = await generateCustomPlannerPdf(options);
        console.log(`PDF generated: ${(pdfBytes.length / 1024 / 1024).toFixed(2)}MB`);

        // Compress PDF using iLovePDF API
        console.log('=== COMPRESSION START ===');
        console.log('API Key configured:', !!process.env.ILOVEPDF_PUBLIC_KEY);

        let compressedBytes;
        try {
            compressedBytes = await compressPdfWithILovePDF(pdfBytes);
            console.log(`PDF after compression: ${(compressedBytes.length / 1024 / 1024).toFixed(2)}MB`);
        } catch (error) {
            console.error('COMPRESSION ERROR:', error);
            compressedBytes = pdfBytes;
        }
        console.log('=== COMPRESSION END ===');

        // Build filename with year, start day, and holiday country
        const startDayShort = (startDay || 'Monday') === 'Monday' ? 'Mon' : 'Sun';
        const holidayCode = holidaySettings?.countryCode || 'NoHoliday';
        const filename = `classic_planner_${year}_${startDayShort}_${holidayCode}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(Buffer.from(compressedBytes));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error generating PDF' });
    }
}
