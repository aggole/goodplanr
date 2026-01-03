import { defineType, defineField } from 'sanity';

export default defineType({
    name: 'review',
    title: 'Reviews',
    type: 'document',
    fields: [
        defineField({
            name: 'product',
            title: 'Product',
            type: 'reference',
            to: [{ type: 'product' }],
        }),
        defineField({
            name: 'author',
            title: 'Author',
            type: 'string',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'rating',
            title: 'Rating',
            type: 'number',
            validation: (Rule) => Rule.required().min(1).max(5),
        }),
        defineField({
            name: 'content',
            title: 'Content',
            type: 'text',
        }),
        defineField({
            name: 'date',
            title: 'Date',
            type: 'date',
        }),
        defineField({
            name: 'source',
            title: 'Source',
            type: 'string',
            initialValue: 'Loox Import',
        }),
        defineField({
            name: 'verified',
            title: 'Verified Purchase',
            type: 'boolean',
            initialValue: true,
        }),
        defineField({
            name: 'images',
            title: 'Images',
            type: 'array',
            of: [{ type: 'image' }],
        }),
    ],
    preview: {
        select: {
            title: 'author',
            subtitle: 'content',
            rating: 'rating',
        },
        prepare({ title, subtitle, rating }) {
            return {
                title,
                subtitle: `${'⭐'.repeat(rating || 0)} - ${subtitle ? subtitle.substring(0, 50) + '...' : ''}`,
            };
        },
    },
});
