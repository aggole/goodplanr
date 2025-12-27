import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

export const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
    useCdn: true, // set to false if you need fresh data
    apiVersion: '2024-01-01',
});

// Helper for generating image URLs
const builder = imageUrlBuilder(client);

export function urlFor(source: any) {
    return builder.image(source);
}

// Common queries
export const queries = {
    products: `*[_type == "product" && published == true] | order(_createdAt desc)`,
    product: (slug: string) => `*[_type == "product" && slug.current == "${slug}"][0]`,
    banners: `*[_type == "banner" && active == true] | order(order asc)`,
    testimonials: `*[_type == "testimonial" && approved == true] | order(date desc)`,
};
