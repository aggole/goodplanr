
import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            // Get planner type from query param, default to 'classic'
            const plannerType = (req.query.type as string) || 'classic';

            const configDir = path.join(process.cwd(), 'config');
            const configPath = path.join(configDir, `${plannerType}_config.json`);

            // Also check legacy path for backwards compatibility
            const legacyPath = path.join(configDir, 'planner_settings.json');

            if (fs.existsSync(configPath)) {
                const configBytes = fs.readFileSync(configPath, 'utf-8');
                const config = JSON.parse(configBytes);
                res.status(200).json(config);
            } else if (plannerType === 'classic' && fs.existsSync(legacyPath)) {
                // Migrate legacy config to classic
                const configBytes = fs.readFileSync(legacyPath, 'utf-8');
                const config = JSON.parse(configBytes);
                res.status(200).json(config);
            } else {
                res.status(404).json({ error: `No config found for ${plannerType}` });
            }
        } catch (error) {
            console.error('Load Config Error:', error);
            res.status(500).json({ error: 'Failed to load config' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
