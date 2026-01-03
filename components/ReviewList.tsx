import React, { useState } from 'react';

interface Review {
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
                <svg key={i} className="w-4 h-4" viewBox="0 0 20 20" fill={i < rating ? "#FFA500" : "#E5E7EB"}>
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
    );
};

export default function ReviewList({ initialReviews }: { initialReviews: Review[] }) {
    const [visibleReviews, setVisibleReviews] = useState(50);
    const reviews = initialReviews || [];

    const averageRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : "5.0";

    const handleLoadMore = () => {
        setVisibleReviews((prev) => prev + 20);
    };

    return (
        <div className="max-w-7xl mx-auto py-6 px-4">
            {/* Header with rating summary */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="flex">
                        {[...Array(5)].map((_, i) => (
                            <svg key={i} className="w-5 h-5" viewBox="0 0 20 20" fill="#FFA500">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                        ))}
                    </div>
                    <span className="text-sm font-medium">{reviews.length} Reviews</span>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>

            {/* Masonry grid layout */}
            <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
                {reviews.slice(0, visibleReviews).map((review) => (
                    <div
                        key={review._id}
                        className="break-inside-avoid bg-white rounded-lg border border-gray-200 overflow-hidden inline-block w-full"
                    >
                        {/* Review images */}
                        {review.images && review.images.length > 0 && (
                            <div className={`grid gap-1 ${review.images.length === 1 ? 'grid-cols-1' :
                                    review.images.length === 2 ? 'grid-cols-2' :
                                        review.images.length === 3 ? 'grid-cols-3' :
                                            'grid-cols-2'
                                }`}>
                                {review.images.slice(0, 4).map((img, i) => (
                                    <div
                                        key={i}
                                        className={`relative ${review.images!.length === 1 ? 'aspect-square' :
                                                review.images!.length === 3 && i === 0 ? 'col-span-3 aspect-video' :
                                                    'aspect-square'
                                            }`}
                                    >
                                        <img
                                            src={img.asset.url}
                                            alt={`Review by ${review.author}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Review content */}
                        <div className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium text-sm">{review.author}</h3>
                                {review.verified && (
                                    <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>

                            <div className="text-xs text-gray-500 mb-2">
                                {review.date}
                            </div>

                            <div className="mb-3">
                                <StarRating rating={review.rating} />
                            </div>

                            <p className="text-sm text-gray-700 leading-relaxed mb-3">
                                {review.content}
                            </p>

                            <div className="text-xs text-gray-400">
                                Classic Digital Planner
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Load more button */}
            {visibleReviews < reviews.length && (
                <div className="mt-8 text-center">
                    <button
                        onClick={handleLoadMore}
                        className="px-8 py-3 bg-white border-2 border-black text-black font-medium rounded hover:bg-black hover:text-white transition-colors"
                    >
                        Show more reviews
                    </button>
                </div>
            )}
        </div>
    );
}
