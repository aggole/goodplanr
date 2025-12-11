# Monthly Planner Template - Coordinate Extraction

This directory contains the PDF templates and coordinate mappings for the monthly planner.

## 📁 Files

### PDF Templates
- **`monthly_filled.pdf`** - Original template with sample dates filled in
- **`monthly_blank.pdf`** - Blank template with all date numbers removed (ready for dynamic insertion)

### Coordinate Data
- **`coordinates.json`** - Raw coordinate data extracted from the filled PDF
- **`monthly-coordinates.ts`** - TypeScript coordinate mappings with type definitions

## 📊 Extracted Data Summary

- **Total Pages:** 1
- **Page Dimensions:** 1366 x 968 pixels
- **Total Text Elements:** 106
- **Date Numbers Found:** 73

### Date Groups

#### 1. Large Calendar (Main Monthly View)
- **Count:** 37 dates
- **Font Height:** 17px
- **X Range:** 397.74 - 1306.95
- **Y Range:** 125.38 - 875.38
- **Usage:** Main calendar grid for the month

#### 2. Small Calendar (Mini Calendar)
- **Count:** 28 dates
- **Font Height:** 11.05px
- **X Range:** 31.07 - 166.57
- **Y Range:** 226.31 - 302.32
- **Usage:** Small reference calendar

#### 3. Month Labels
- **Count:** 14 labels (JAN, FEB, MAR, etc.)
- **Font Height:** 12.5px
- **X Position:** ~217.69 (consistent)

#### 4. Day of Week Labels
- **Count:** 7 labels (MONDAY - SUNDAY)
- **Font Height:** 16px
- **Y Position:** 905.75 (consistent)

## 🚀 Usage

### Import Coordinates

```typescript
import { 
  LARGE_CALENDAR_DATES, 
  SMALL_CALENDAR_DATES,
  MONTH_LABELS,
  DAY_LABELS,
  PAGE_DIMENSIONS 
} from './monthly-coordinates';
```

### Generate a Monthly Planner

```typescript
import { generateMonthlyPlanner } from '../utils/generate-monthly-planner';

// Generate January 2025 planner
await generateMonthlyPlanner(1, 2025, './output/january-2025.pdf');
```

### Manual Date Insertion

```typescript
import { PDFDocument, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import { LARGE_CALENDAR_DATES } from './monthly-coordinates';

const templateBytes = fs.readFileSync('./monthly_blank.pdf');
const pdfDoc = await PDFDocument.load(templateBytes);
const page = pdfDoc.getPage(0);
const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

// Insert dates
LARGE_CALENDAR_DATES.forEach((coord, index) => {
  const dateNumber = index + 1;
  page.drawText(dateNumber.toString(), {
    x: coord.x,
    y: coord.y,
    size: 14,
    font: font,
  });
});

const pdfBytes = await pdfDoc.save();
fs.writeFileSync('./output.pdf', pdfBytes);
```

## 🛠️ Scripts

### Extract Coordinates from PDF
```bash
node scripts/extract-pdf-coordinates.js
```

### Analyze Extracted Coordinates
```bash
node scripts/analyze-coordinates.js
```

### Create Blank Template
```bash
node scripts/create-blank-template.js
```

## 📝 Notes

- The coordinate system origin (0,0) is at the **bottom-left** corner of the PDF
- Y-coordinates increase from bottom to top
- All coordinates are in PDF points (1/72 inch)
- Font sizes may need adjustment based on your specific template design
- The blank template was created by covering date numbers with white rectangles

## 🔄 Workflow

1. **Upload filled PDF** → Extract coordinates → Generate coordinate mappings
2. **Create blank template** → Remove all dynamic dates
3. **Use blank template** → Insert dynamic dates based on month/year
4. **Generate planners** → Create customized monthly planners on demand

## 🎯 Next Steps

1. Customize the date insertion logic in `utils/generate-monthly-planner.ts`
2. Map dates to correct calendar positions based on day of week
3. Add support for different months (28/29/30/31 days)
4. Integrate with your existing planner generation API
