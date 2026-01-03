import React from 'react';
import Link from 'next/link';

interface FeaturedReview {
    _id: string;
    author: string;
    rating: number;
    content: string;
    date: string;
    verified: boolean;
    images?: { asset: { url: string } }[];
}

const StarRating = ({ rating }: { rating: number }) => {
    return (
        <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-3.5 h-3.5" viewBox="0 0 20 20" fill={i < rating ? "#FFA500" : "#E5E7EB"}>
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
    );
};

export default function FeaturedReviews({ reviews }: { reviews: FeaturedReview[] }) {
    // Show max 8 reviews
    const displayReviews = reviews.slice(0, 8);

    return (
        <div className="mt-20 mb-12">
            {/* Header */}
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2">What Our Customers Say</h2>
                <p className="text-gray-600">Join thousands of satisfied planners</p>
            </div>

            {/* Reviews Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {displayReviews.map((review) => (
                    <div
                        key={review._id}
                        className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col"
                    >
                        {/* Review image */}
                        {review.images && review.images.length > 0 && (
                            <div className="relative aspect-square">
                                <img
                                    src={review.images[0].asset.url}
                                    alt={`Review by ${review.author}`}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

                        {/* Review content */}
                        <div className="p-3 flex-1 flex flex-col">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium text-sm">{review.author}</h3>
                                {review.verified && (
                                    <svg className="w-3.5 h-3.5 text-black flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>

                            <div className="mb-2">
                                <StarRating rating={review.rating} />
                            </div>

                            <p className="text-xs text-gray-700 leading-relaxed line-clamp-3 flex-1">
                                {review.content}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* View All Link */}
            <div className="text-center">
                <Link
                    href="/reviews"
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-black transition-colors"
                >
                    View all {reviews.length} reviews
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </Link>
            </div>
        </div>
    );
}
