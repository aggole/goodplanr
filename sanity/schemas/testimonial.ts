import { defineType, defineField } from 'sanity';

export default defineType({
    name: 'testimonial',
    title: 'Testimonials',
    type: 'document',
    fields: [
        defineField({
            name: 'customerName',
            title: 'Customer Name',
            type: 'string',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'rating',
            title: 'Rating',
            type: 'number',
            validation: (Rule) => Rule.required().min(1).max(5),
            initialValue: 5,
        }),
        defineField({
            name: 'comment',
            title: 'Testimonial',
            type: 'text',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'date',
            title: 'Date',
            type: 'date',
            initialValue: () => new Date().toISOString().split('T')[0],
        }),
        defineField({
            name: 'approved',
            title: 'Approved',
            type: 'boolean',
            initialValue: false,
            description: 'Only approved testimonials will be displayed',
        }),
    ],
    preview: {
        select: {
            title: 'customerName',
            subtitle: 'comment',
            rating: 'rating',
        },
        prepare({ title, subtitle, rating }) {
            return {
                title,
                subtitle: `${'⭐'.repeat(rating)} - ${subtitle}`,
            };
        },
    },
});
