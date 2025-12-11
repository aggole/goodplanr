import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { type } = req.query;
    const allowedTypes = [
        'yearly', 'overview', 'monthly', 'weekly', 'daily', 'global',
        'grid', 'dot', 'line', 'blank'
    ];
    if (!type || typeof type !== 'string' || !allowedTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid template type' });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'templates', 'custom');

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
        uploadDir,
        keepExtensions: true,
        filename: (name, ext, part, form) => {
            return `${type}_template.pdf`; // Overwrite existing template of same type
        },
        filter: ({ mimetype }) => mimetype === 'application/pdf',
    });

    try {
        const [fields, files] = await form.parse(req);
        const file = files.file?.[0];

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Rename to ensure consistent naming (formidable might add random characters if not configured strictly)
        // But we used filename option, so it should be fine.
        // Let's double check the path.
        const expectedPath = path.join(uploadDir, `${type}_template.pdf`);

        // If formidable didn't use the exact name (sometimes it appends counter), rename it.
        if (file.filepath !== expectedPath) {
            fs.renameSync(file.filepath, expectedPath);
        }

        return res.status(200).json({
            success: true,
            path: `/templates/custom/${type}_template.pdf`
        });
    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({ error: 'File upload failed' });
    }
}
