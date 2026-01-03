
import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { Roboto } from 'next/font/google';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const roboto = Roboto({
  weight: ['400', '500'],
  subsets: ['latin'],
});

const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

const WEEKDAYS_MON = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKDAYS_SUN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Style constants based on the reference image description
const STYLE = {
  width: 300,
  height: 400, // Adjusted to fit content
  padding: 20,
  titleSize: 32,
  dayHeaderSize: 20,
  dateSize: 20,
  rowHeight: 40,
  colWidth: 40,
  colors: {
    title: '#9CA3AF', // Gray-400
    weekday: '#9CA3AF', // Gray-400
    date: '#9CA3AF', // Gray-400
    weekend: '#FF8A65', // Salmon/Orange color often used in these templates
  }
};

export default function MiniCalendarGenerator() {
  const [year, setYear] = useState<number>(2026);
  const [weekStart, setWeekStart] = useState<'Monday' | 'Sunday'>('Monday');
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Preview the first month (January) whenever settings change
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        drawMonth(ctx, year, 0, weekStart);
      }
    }
  }, [year, weekStart]);

  const drawMonth = (
    ctx: CanvasRenderingContext2D,
    year: number,
    monthIndex: number,
    weekStart: 'Monday' | 'Sunday'
  ) => {
    // Clear canvas
    ctx.clearRect(0, 0, STYLE.width, STYLE.height);

    // Set Font
    ctx.font = `400 ${STYLE.titleSize}px ${roboto.style.fontFamily}, sans-serif`;
    ctx.textBaseline = 'top';

    // Draw Header: "JAN 2026"
    ctx.fillStyle = STYLE.colors.title;
    ctx.textAlign = 'left';
    ctx.fillText(`Goodplanr ${MONTHS[monthIndex]} ${year}`, STYLE.padding + 12, STYLE.padding);

    // Draw Weekday Headers
    ctx.font = `400 ${STYLE.dayHeaderSize}px ${roboto.style.fontFamily}, sans-serif`;
    const headerY = STYLE.padding + STYLE.titleSize + 20;
    const weekdays = weekStart === 'Monday' ? WEEKDAYS_MON : WEEKDAYS_SUN;

    weekdays.forEach((day, i) => {
      const x = STYLE.padding + (i * STYLE.colWidth) + (STYLE.colWidth / 2);
      ctx.textAlign = 'center';

      // Highlight weekends in header? Usually kept gray in these designs, but let's check.
      // Assuming weekends are columns 5,6 (Sat, Sun) for Mon start, or 0,6 (Sun, Sat) for Sun start
      let isWeekend = false;
      if (weekStart === 'Monday') {
        if (i === 5 || i === 6) isWeekend = true;
      } else {
        if (i === 0 || i === 6) isWeekend = true;
      }

      ctx.fillStyle = isWeekend ? STYLE.colors.weekend : STYLE.colors.weekday;
      ctx.fillText(day, x, headerY);
    });

    // Draw Dates
    ctx.font = `400 ${STYLE.dateSize}px ${roboto.style.fontFamily}, sans-serif`;
    const startY = headerY + STYLE.rowHeight;

    const firstDay = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    // Calculate starting offset (0-6)
    let startDayCallback = firstDay.getDay(); // 0 is Sunday
    let offset = 0;

    if (weekStart === 'Monday') {
      // Mon=0, Sun=6
      offset = startDayCallback === 0 ? 6 : startDayCallback - 1;
    } else {
      // Sun=0, Sat=6
      offset = startDayCallback;
    }

    let currentDay = 1;
    let row = 0;

    while (currentDay <= daysInMonth) {
      for (let col = 0; col < 7; col++) {
        if (row === 0 && col < offset) {
          // Empty slots before start of month
          continue;
        }

        if (currentDay > daysInMonth) break;

        const x = STYLE.padding + (col * STYLE.colWidth) + (STYLE.colWidth / 2);
        const y = startY + (row * STYLE.rowHeight);

        // Determine if weekend
        let isWeekend = false;
        if (weekStart === 'Monday') {
          if (col === 5 || col === 6) isWeekend = true;
        } else {
          if (col === 0 || col === 6) isWeekend = true;
        }

        ctx.fillStyle = isWeekend ? STYLE.colors.weekend : STYLE.colors.date;
        ctx.fillText(currentDay.toString(), x, y);

        currentDay++;
      }
      row++;
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    const zip = new JSZip();

    // Create a temporary canvas for generation
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = STYLE.width;
    tempCanvas.height = STYLE.height;
    const ctx = tempCanvas.getContext('2d');

    if (!ctx) {
      setIsGenerating(false);
      return;
    }

    // Generate 12 months
    for (let i = 0; i < 12; i++) {
      drawMonth(ctx, year, i, weekStart);

      // Convert to blob
      const blob = await new Promise<Blob | null>(resolve => tempCanvas.toBlob(resolve, 'image/png'));
      if (blob) {
        zip.file(`${MONTHS[i]}.png`, blob);
      }
    }

    // Generate zip
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `calendar-${year}-${weekStart}.zip`);

    setIsGenerating(false);
  };

  return (
    <div className={`min-h-screen bg-white p-8 ${roboto.className}`}>
      <Head>
        <title>Mini Calendar Generator</title>
      </Head>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Mini Calendar Generator</h1>

        {/* Controls */}
        <div className="bg-gray-50 p-6 rounded-lg mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="block w-full border border-gray-300 rounded-md p-2"
            >
              {Array.from({ length: 11 }, (_, i) => 2025 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Week Start</label>
            <div className="flex space-x-4 mt-2">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  checked={weekStart === 'Monday'}
                  onChange={() => setWeekStart('Monday')}
                />
                <span className="ml-2">Monday</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  checked={weekStart === 'Sunday'}
                  onChange={() => setWeekStart('Sunday')}
                />
                <span className="ml-2">Sunday</span>
              </label>
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
            >
              {isGenerating ? 'Generating...' : 'Download ZIP'}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="border border-gray-200 rounded-lg p-8 flex justify-center bg-white shadow-sm">
          <div className="text-center">
            <h3 className="text-sm text-gray-500 mb-4">Preview (January)</h3>
            <canvas
              ref={canvasRef}
              width={STYLE.width}
              height={STYLE.height}
              className="border border-gray-100"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
