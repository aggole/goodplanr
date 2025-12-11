
import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        try {
            const config = req.body;
            // Get planner type from query param or config body
            const plannerType = (req.query.type as string) || config.plannerType || 'classic';

            // Use planner-type-specific config file
            const configDir = path.join(process.cwd(), 'config');
            const configPath = path.join(configDir, `${plannerType}_config.json`);

            // Ensure config dir exists
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            res.status(200).json({ success: true, message: `Saved ${plannerType} config` });
        } catch (error) {
            console.error('Save Config Error:', error);
            res.status(500).json({ error: 'Failed to save config' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
