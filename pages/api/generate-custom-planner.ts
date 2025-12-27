import { NextApiRequest, NextApiResponse } from 'next';
import { generateCustomPlannerPdf, CustomPlannerOptions } from '../../lib/planner';
import { compressPdfWithILovePDF } from '../../utils/compress-pdf';

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

        console.log('=== PDF GENERATION START ===');
        console.log('Generating PDF...');
        const pdfBytes = await generateCustomPlannerPdf(options);
        console.log(`PDF generated: ${(pdfBytes.length / 1024 / 1024).toFixed(2)}MB`);

        // Compress PDF using iLovePDF API
        console.log('=== COMPRESSION START ===');
        console.log('Attempting to compress PDF with iLovePDF...');
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
        const filename = `planner_${year}_${startDayShort}_${holidayCode}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(Buffer.from(compressedBytes));

    } catch (error) {
        console.error('Error generating planner:', error);
        res.status(500).json({ error: 'Failed to generate planner' });
    }
}
