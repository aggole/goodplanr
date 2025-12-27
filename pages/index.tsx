import Head from 'next/head';
import { PlannerLayout } from '@/components/planner-layout';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>GoodPlanr - Digital Planner Generator</title>
        <meta name="description" content="Build professional digital planners with customizable holidays" />
      </Head>

      <main className="px-6 py-12">
        <PlannerLayout />
      </main>
    </div>
  );
}
