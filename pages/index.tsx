
import Head from 'next/head';
import { useState } from 'react';

export default function Home() {
  const [year, setYear] = useState('2026');
  const [startDay, setStartDay] = useState('Monday');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/generate-planner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ year, startDay }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `planner-${year}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error(error);
      alert('Error generating planner');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <Head>
        <title>Digital Planner Generator</title>
        <meta name="description" content="Generate your custom digital planner" />
      </Head>

      <main>
        <h1 style={{ textAlign: 'center' }}>Digital Planner Generator</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Select Year:</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="2028">2028</option>
              <option value="2029">2029</option>
              <option value="2030">2030</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Start Day:</label>
            <select
              value={startDay}
              onChange={(e) => setStartDay(e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
            >
              <option value="Monday">Monday</option>
              <option value="Sunday">Sunday</option>
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{
              padding: '1rem',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              marginTop: '1rem'
            }}
          >
            {loading ? 'Generating...' : 'Generate Planner'}
          </button>
        </div>
      </main>
    </div>
  );
}
