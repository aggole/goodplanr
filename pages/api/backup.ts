
import { exec } from 'child_process';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const backupScript = path.join(process.cwd(), 'scripts', 'backup.js');

        // Execute the backup script
        exec(`node "${backupScript}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Backup execution error: ${error.message}`);
                return res.status(500).json({ error: 'Backup failed', details: error.message });
            }
            if (stderr) {
                console.warn(`Backup stderr: ${stderr}`);
            }
            console.log(`Backup stdout: ${stdout}`);
            res.status(200).json({ success: true, message: 'Backup completed successfully' });
        });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
