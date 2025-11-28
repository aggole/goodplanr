
import type { NextApiRequest, NextApiResponse } from 'next';
import { generatePlannerPdf } from '../../lib/planner';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        res.status(405).send({ message: 'Only POST requests allowed' });
        return;
    }

    const { year, startDay } = req.body;

    try {
        const pdfBytes = await generatePlannerPdf({
            year: parseInt(year),
            startDay
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=planner-${year}.pdf`);
        res.send(Buffer.from(pdfBytes));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error generating PDF' });
    }
}
