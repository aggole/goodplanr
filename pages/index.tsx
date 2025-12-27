
import Head from 'next/head';
import { useState } from 'react';
import Link from 'next/link';

// Popular countries for holiday selection - sorted alphabetically
const holidayCountries = [
  { code: '', name: 'None (No holidays)' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CA', name: 'Canada' },
  { code: 'CN', name: 'China' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'MX', name: 'Mexico' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NO', name: 'Norway' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'KR', name: 'South Korea' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
];

type PlannerType = 'classic' | 'veho' | 'vertical';

interface PlannerOption {
  id: PlannerType;
  name: string;
  description: string;
  available: boolean;
}

const plannerTypes: PlannerOption[] = [
  { id: 'classic', name: 'Classic', description: 'Clean, minimal design with monthly, weekly, and daily views', available: true },
  { id: 'veho', name: 'Veho', description: 'Modern dynamic layout with enhanced productivity features', available: false },
  { id: 'vertical', name: 'Vertical', description: 'Vertical week layout optimized for portrait viewing', available: false },
];

export default function Home() {
  const [selectedPlanner, setSelectedPlanner] = useState<PlannerType>('classic');
  const [year, setYear] = useState('2026');
  const [startDay, setStartDay] = useState('Monday');
  const [holidayCountry, setHolidayCountry] = useState('');
  const [showObservance, setShowObservance] = useState(true); // Include Father's Day, Mother's Day, etc.
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    const planner = plannerTypes.find(p => p.id === selectedPlanner);
    if (!planner?.available) {
      alert('This planner type is coming soon!');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/generate-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          startDay,
          holidaySettings: holidayCountry ? {
            countryCode: holidayCountry,
            showPublic: true,
            showBank: true,
            showObservance: showObservance
          } : undefined
        }),
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const startDayShort = startDay === 'Monday' ? 'Mon' : 'Sun';
      const holidayCode = holidayCountry || 'NoHoliday';
      a.download = `${selectedPlanner}_planner_${year}_${startDayShort}_${holidayCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Error generating planner');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <Head>
        <title>GoodPlanr - Digital Planner Generator</title>
        <meta name="description" content="Generate beautiful digital planners with holiday support" />
      </Head>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            🗓️ GoodPlanr
          </h1>
          <p className="text-xl text-slate-400">
            Create beautiful digital planners with customizable holidays
          </p>
        </div>

        {/* Planner Type Selection */}
        <div className="mb-10">
          <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-4 text-center">
            Choose Your Planner Style
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plannerTypes.map((planner) => (
              <button
                key={planner.id}
                onClick={() => setSelectedPlanner(planner.id)}
                disabled={!planner.available}
                className={`relative p-6 rounded-xl border-2 transition-all duration-200 text-left ${selectedPlanner === planner.id
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20'
                  : planner.available
                    ? 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
                    : 'border-slate-800 bg-slate-900/50 opacity-60 cursor-not-allowed'
                  }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold">{planner.name}</h3>
                  {planner.available ? (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                      Available
                    </span>
                  ) : (
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400">{planner.description}</p>
                {selectedPlanner === planner.id && planner.available && (
                  <div className="absolute top-3 right-3 w-3 h-3 bg-indigo-500 rounded-full animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Configuration Options */}
        <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 mb-8">
          <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-6">
            Configure Your Planner
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Year */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:outline-none transition-colors"
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
                <option value="2029">2029</option>
                <option value="2030">2030</option>
              </select>
            </div>

            {/* Start Day */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Week Starts On</label>
              <select
                value={startDay}
                onChange={(e) => setStartDay(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:outline-none transition-colors"
              >
                <option value="Monday">Monday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>

            {/* Holiday Country */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">🎄 Holidays</label>
              <select
                value={holidayCountry}
                onChange={(e) => setHolidayCountry(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:outline-none transition-colors"
              >
                {holidayCountries.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Observance Toggle - only show when a country is selected */}
          {holidayCountry && (
            <div className="mt-6 pt-4 border-t border-slate-700">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={showObservance}
                  onChange={(e) => setShowObservance(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                />
                <div>
                  <span className="text-sm text-white group-hover:text-indigo-300 transition-colors">
                    Include Cultural Days
                  </span>
                  <p className="text-xs text-slate-500">
                    Valentine's, Mother's/Father's Day (not official holidays)
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <div className="text-center mb-8">
          <button
            onClick={handleGenerate}
            disabled={loading || !plannerTypes.find(p => p.id === selectedPlanner)?.available}
            className={`px-12 py-4 rounded-xl text-lg font-semibold transition-all duration-200 ${loading
              ? 'bg-slate-700 text-slate-400 cursor-wait'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transform hover:-translate-y-0.5'
              }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </span>
            ) : (
              `🚀 Generate ${plannerTypes.find(p => p.id === selectedPlanner)?.name || ''} Planner`
            )}
          </button>
        </div>

        {/* Builder Link */}
        <div className="text-center">
          <Link
            href="/builder"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-400 transition-colors"
          >
            <span>Need more customization? Open the Builder</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
          <p>Made with ❤️ for planners everywhere</p>
        </footer>
      </main>
    </div>
  );
}
