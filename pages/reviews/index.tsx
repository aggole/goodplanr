import Head from 'next/head';
import { defineQuery } from 'next-sanity';
import { client } from '../../lib/sanity.client';
import ReviewList from '../../components/ReviewList';

const reviewsQuery = defineQuery(`
  *[_type == "review"] | order(
    defined(images[0]) desc,
    date desc
  ) {
    _id,
    author,
    rating,
    content,
    date,
    verified,
    images[] {
      asset->{
        url
      }
    }
  }
`);

export async function getStaticProps() {
    const reviews = await client.fetch(reviewsQuery);
    return {
        props: {
            reviews,
        },
        revalidate: 60,
    };
}

export default function ReviewsPage({ reviews }: { reviews: any[] }) {
    return (
        <div className="min-h-screen bg-white">
            <Head>
                <title>Customer Reviews | Goodplanr</title>
                <meta name="description" content="See what our customers are saying about Goodplanr digital planners." />
            </Head>

            <main className="py-8">
                <div className="max-w-7xl mx-auto px-4 mb-6">
                    <h1 className="text-3xl font-bold">Reviews</h1>
                </div>

                <ReviewList initialReviews={reviews} />
            </main>
        </div>
    );
}
