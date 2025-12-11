
import type { NextApiRequest, NextApiResponse } from 'next';
import { generateCustomPlannerPdf, CustomPlannerOptions } from '../../lib/planner';
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

    const { year, startDay, holidaySettings } = req.body;

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
            config,
            scope: 'full',
            holidaySettings
        };

        const pdfBytes = await generateCustomPlannerPdf(options);

        // Build filename with year, start day, and holiday country
        const startDayShort = (startDay || 'Monday') === 'Monday' ? 'Mon' : 'Sun';
        const holidayCode = holidaySettings?.countryCode || 'NoHoliday';
        const filename = `classic_planner_${year}_${startDayShort}_${holidayCode}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(Buffer.from(pdfBytes));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error generating PDF' });
    }
}
