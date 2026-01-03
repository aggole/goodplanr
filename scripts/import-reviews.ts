import { createClient } from '@sanity/client';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import { basename } from 'path';

dotenv.config({ path: '.env.local' });

const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    token: process.env.SANITY_API_TOKEN, // Ensure this token has write access
    apiVersion: '2024-01-01',
    useCdn: false,
});

const CSV_FILE_PATH = path.join(process.cwd(), 'public', 'reviews.csv');

async function uploadImage(url: string) {
    try {
        // Only attempt if URL is valid
        if (!url || !url.startsWith('http')) return null;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${url}`);

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const asset = await client.assets.upload('image', buffer, {
            filename: basename(url),
        });

        return asset._id;
    } catch (error) {
        console.error(`Error uploading image ${url}:`, error);
        return null;
    }
}

async function importReviews() {
    if (!fs.existsSync(CSV_FILE_PATH)) {
        console.error('File not found:', CSV_FILE_PATH);
        return;
    }

    const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
    });

    console.log(`Found ${records.length} reviews to import...`);

    let imported = 0;
    let skipped = 0;

    for (const record of records as any[]) {
        // Skip non-active reviews
        if (record['status'] !== 'Active') {
            skipped++;
            continue;
        }

        // Map Loox CSV fields to Sanity fields
        const review = {
            _type: 'review',
            author: record['nickname'] || 'Anonymous',
            rating: parseInt(record['rating'] || '5', 10),
            content: record['review'] || '',
            date: record['date'] ? new Date(record['date']).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            source: 'Loox Import',
            verified: record['verified_purchase'] === 'true' || record['verified_purchase'] === 'TRUE',
            // Optional: link to product if you can map it
        };

        // Handle images if present (Loox has 'img' column with comma-separated URLs)
        if (record['img']) {
            const imageUrls = record['img'].split(',').map((s: string) => s.trim()).filter(Boolean);
            const imageAssets = [];

            for (const url of imageUrls) {
                const assetId = await uploadImage(url);
                if (assetId) {
                    imageAssets.push({
                        _type: 'image',
                        asset: {
                            _type: 'reference',
                            _ref: assetId,
                        },
                    });
                }
            }

            if (imageAssets.length > 0) {
                // @ts-ignore
                review.images = imageAssets;
            }
        }

        try {
            await client.create(review);
            console.log(`✓ Imported review by ${review.author} (${review.rating}⭐)`);
            imported++;
        } catch (err) {
            console.error('✗ Failed to import review:', err);
        }
    }

    console.log('\n============================');
    console.log(`Import completed!`);
    console.log(`✓ Imported: ${imported}`);
    console.log(`⊗ Skipped: ${skipped}`);
    console.log('============================');
}

importReviews();
