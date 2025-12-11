import { NextApiRequest, NextApiResponse } from 'next';
import { generateCustomPlannerPdf, CustomPlannerOptions } from '../../lib/planner';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { year, startDay, config, extras, scope, limit, holidaySettings } = req.body;

        if (!year || !config) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const options: CustomPlannerOptions = {
            year: parseInt(year),
            startDay: startDay || 'Monday',
            config,
            extras,
            scope,
            limit,
            holidaySettings
        };

        const pdfBytes = await generateCustomPlannerPdf(options);

        // Build filename with year, start day, and holiday country
        const startDayShort = (startDay || 'Monday') === 'Monday' ? 'Mon' : 'Sun';
        const holidayCode = holidaySettings?.countryCode || 'NoHoliday';
        const filename = `planner_${year}_${startDayShort}_${holidayCode}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(Buffer.from(pdfBytes));

    } catch (error) {
        console.error('Error generating planner:', error);
        res.status(500).json({ error: 'Failed to generate planner' });
    }
}
