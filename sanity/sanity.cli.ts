import { defineCli } from 'sanity/cli';

export default defineCli({
    api: {
        projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
        dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
    },
    autoUpdates: true,
});
