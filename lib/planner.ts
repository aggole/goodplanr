
import { PDFDocument, PDFPage, PDFFont, rgb, StandardFonts, PDFName, PDFRef, degrees, PDFString } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { getHolidaysForYear, isHoliday, Holiday, HolidaySettings, getHolidayDisplayName } from './holidays';

// --- SHARED INTERFACES ---

export interface PlaceholderConfig {
    id: string;
    type: string;
    label: string;
    x: number;
    y: number;
    style?: {
        font: string;
        fontSize: number;
        textTransform?: 'uppercase' | 'none';
        align?: 'left' | 'center' | 'right';
        letterSpacing?: number;
        color?: string;
    };
    grid?: {
        cols: number;
        rows: number;
        width: number;
        height: number;
        paddingX: number;
        paddingY: number;
        indicatorY?: number; // Manual Y offset for indicators (weekly pill)
        holidayOffsetY?: number; // Y offset for holiday labels below week dates
        holidayOffsetX?: number; // X offset for holiday labels
        holidayFontSize?: number; // Font size for holiday labels
    };
}

export interface CustomPlannerOptions {
    year: number;
    startDay: 'Monday' | 'Sunday';
    config: {
        mini?: PlaceholderConfig[]; // New Mini Calendar Definition
        yearly?: PlaceholderConfig[];
        overview?: PlaceholderConfig[];
        monthly: PlaceholderConfig[];
        weekly: PlaceholderConfig[];
        daily: PlaceholderConfig[];
        global: PlaceholderConfig[];
    };
    extras?: {
        grid?: { count: number; template?: string }; // template is base64 or path? For now assume standard name or uploaded
        dot?: { count: number; template?: string };
        line?: { count: number; template?: string };
        blank?: { count: number; template?: string };
    };
    scope: 'full' | 'year' | 'overview' | 'monthly' | 'weekly' | 'daily'; // 'extras' could be added
    limit?: number;
    // Holiday settings
    holidaySettings?: {
        countryCode?: string;
        showPublic?: boolean;
        showBank?: boolean;
        showObservance?: boolean;
        displayStyle?: 'highlight' | 'label' | 'dot' | 'all';
    };
}

interface PageLink {
    pageIndex: number;
    rect: [number, number, number, number]; // llx, lly, urx, ury
    targetPageIndex?: number;
    targetType?: 'DAY' | 'WEEK' | 'MONTH';
    targetId?: number;
}

// --- GENERATOR FUNCTION ---

export async function generateCustomPlannerPdf(options: CustomPlannerOptions): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const fontkit = require('fontkit');
    doc.registerFontkit(fontkit);

    // Load Fonts
    const fontsDir = path.join(process.cwd(), 'public', 'fonts');
    const regularFont = await doc.embedFont(fs.readFileSync(path.join(fontsDir, 'Roboto-Regular.ttf')));
    const boldFont = await doc.embedFont(fs.readFileSync(path.join(fontsDir, 'Roboto-Bold.ttf')));
    const lightFont = fs.existsSync(path.join(fontsDir, 'Roboto-Light.ttf'))
        ? await doc.embedFont(fs.readFileSync(path.join(fontsDir, 'Roboto-Light.ttf')))
        : regularFont;
    const thinFont = fs.existsSync(path.join(fontsDir, 'Roboto-Thin.ttf'))
        ? await doc.embedFont(fs.readFileSync(path.join(fontsDir, 'Roboto-Thin.ttf')))
        : lightFont;
    const mediumFont = fs.existsSync(path.join(fontsDir, 'Roboto-Medium.ttf'))
        ? await doc.embedFont(fs.readFileSync(path.join(fontsDir, 'Roboto-Medium.ttf')))
        : regularFont;

    // Load CJK fonts for holiday names (Japanese, Korean, Simplified/Traditional Chinese)
    let notoSansJP = boldFont; // Fallback to bold
    let notoSansKR = boldFont;
    let notoSansSC = boldFont; // Simplified Chinese for China
    let notoSansTC = boldFont; // Traditional Chinese for Taiwan/HK
    try {
        const jpPath = path.join(fontsDir, 'NotoSansJP-Medium.ttf');
        const krPath = path.join(fontsDir, 'NotoSansKR-Medium.ttf');
        const scPath = path.join(fontsDir, 'NotoSansSC-Medium.ttf');
        const tcPath = path.join(fontsDir, 'NotoSansTC-Medium.ttf');

        if (fs.existsSync(jpPath)) {
            notoSansJP = await doc.embedFont(fs.readFileSync(jpPath));
        }
        if (fs.existsSync(krPath)) {
            notoSansKR = await doc.embedFont(fs.readFileSync(krPath));
        }
        if (fs.existsSync(scPath)) {
            notoSansSC = await doc.embedFont(fs.readFileSync(scPath));
        }
        if (fs.existsSync(tcPath)) {
            notoSansTC = await doc.embedFont(fs.readFileSync(tcPath));
        }
    } catch (e) {
        console.warn('Could not load CJK fonts, using fallback', e);
    }

    // Load Assets
    let weeklyPillImage;
    try {
        const imagePath = path.join(process.cwd(), 'weekly_pill.png');
        if (fs.existsSync(imagePath)) {
            const imageBytes = fs.readFileSync(imagePath);
            weeklyPillImage = await doc.embedPng(imageBytes);
        }
    } catch (e) {
        console.warn('Could not load weekly_pill.png', e);
    }

    const context = {
        doc,
        year: options.year,
        plannerYear: options.year, // Store initial year for reference
        startDay: options.startDay,
        font: regularFont,
        boldFont,
        lightFont,
        thinFont,
        mediumFont,
        notoSansJP, // Japanese font for holiday labels
        notoSansKR, // Korean font for holiday labels
        notoSansSC, // Simplified Chinese font for China
        notoSansTC, // Traditional Chinese font for Taiwan/HK
        weeklyPillImage, // Add to context
        placeholders: options.config,
        monthlyPageIndices: [] as number[],
        weeklyPageIndices: [] as number[],
        dailyPageIndices: [] as number[],
        overviewPageIndices: [] as number[], // Added overview page tracking
        extraPageIndices: {
            grid: [] as number[],
            dot: [] as number[],
            line: [] as number[],
            blank: [] as number[]
        },
        totalWeeks: 0,
        prevDecWeeklyPageIndices: [] as number[],
        nextJanWeeklyPageIndices: [] as number[],
        prevDecDailyPageIndices: [] as number[],
        nextJanDailyPageIndices: [] as number[],
        nextJanWeekOffset: 0, // Week offset for Next Jan (0 or 1 if Week 1 is skipped)
        prevMonthPageIndex: -1, // Track Prev Dec
        nextMonthPageIndex: -1, // Track Next Jan
        links: [] as any[], // Collect links to apply later
        // Holiday support
        holidaySettings: options.holidaySettings || null,
        holidays: options.holidaySettings?.countryCode
            ? getHolidaysForYear(options.year, options.holidaySettings.countryCode)
            : [] as Holiday[]
    };

    const getMonthWeekCount = (y: number, m: number, startDay: string) => {
        const start = new Date(y, m, 1);
        const end = new Date(y, m + 1, 0);
        // Start week number
        const startW = getWeekNumber(start, startDay as any);
        const endW = getWeekNumber(end, startDay as any);

        // Handling year crossover weeks (52/53 -> 1)
        // Simple heuristic: count unique weeks in this month interval
        const distinctWeeks = new Set<number>();
        for (let d = 1; d <= end.getDate(); d += 7) {
            distinctWeeks.add(getWeekNumber(new Date(y, m, d), startDay as any));
        }
        distinctWeeks.add(getWeekNumber(end, startDay as any));
        return distinctWeeks.size;
    };

    // Calculate Total Weeks Main Year
    const jan1 = new Date(context.year, 0, 1);
    const dec31 = new Date(context.year, 11, 31);
    const week1 = getWeekNumber(jan1, context.startDay);
    const lastWeek = getWeekNumber(dec31, context.startDay);
    // Rough estimate logic or just iterate days?
    // Accurate count:
    let maxWeek = 0;
    for (let m = 0; m < 12; m++) {
        const d = new Date(context.year, m + 1, 0); // last day
        const w = getWeekNumber(d, context.startDay);
        if (w > maxWeek && w < 54) maxWeek = w;
        if (m === 11 && w === 1) {
            // Dec 31 is week 1 of next year, so previous maxWeek is likely correct, or 52/53.
        }
    }
    context.totalWeeks = maxWeek > 50 ? maxWeek : 52; // Fallback

    // FIX: Check for Duplication between Main Year End and Next Jan Start
    // If the last week of Main Year (index totalWeeks-1) overlaps with Next Year Jan 1,
    // we should NOT render it in Main Year (it will be rendered in Next Jan).

    // Calculate Start of Last Week of Main Year
    // Start Date of Main Year Week 1
    const mainYearJan1 = new Date(Date.UTC(context.year, 0, 1));
    const mainYearJan1Day = mainYearJan1.getUTCDay();
    let mainFirstWeekStart: Date;
    if (context.startDay === 'Monday') {
        const jan4 = new Date(Date.UTC(context.year, 0, 4));
        const diff = (jan4.getUTCDay() + 6) % 7;
        mainFirstWeekStart = new Date(Date.UTC(context.year, 0, 4 - diff));
    } else {
        const diff = mainYearJan1Day;
        mainFirstWeekStart = new Date(Date.UTC(context.year, 0, 1 - diff));
    }

    // Start of Last Week = mainFirstWeekStart + (totalWeeks - 1) * 7 days
    const lastWeekStart = new Date(mainFirstWeekStart.getTime());
    lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() + ((context.totalWeeks - 1) * 7));

    // Next Year Start (Jan 1 Year+1)
    const nextYearJan1 = new Date(Date.UTC(context.year + 1, 0, 1));
    // Determine the Start of Week 1 for Next Year
    const nextYearJan1Day = nextYearJan1.getUTCDay();
    let nextYearFirstWeekStart: Date;
    if (context.startDay === 'Monday') {
        const jan4 = new Date(Date.UTC(context.year + 1, 0, 4));
        const diff = (jan4.getUTCDay() + 6) % 7;
        nextYearFirstWeekStart = new Date(Date.UTC(context.year + 1, 0, 4 - diff));
    } else {
        const diff = nextYearJan1Day;
        nextYearFirstWeekStart = new Date(Date.UTC(context.year + 1, 0, 1 - diff));
    }

    // NOTE: Do NOT decrement totalWeeks here even if overlap detected.
    // If Main Year's last week and Next Year's first week overlap,
    // the Next Jan section handles it by skipping Week 1 (nextJanWeekOffset = 1).
    // Decrementing totalWeeks here would cause the week to be removed from BOTH sections.

    // PRE-CALCULATE PAGE INDICES
    // Pages are added in order: Yearly -> Overview -> Monthly -> Weekly -> Daily
    // We need to know specific indices relative to the start of the document.
    // doc.getPageCount() returns current count.

    // 0. Initial Page Count (should be 0)
    let currentPageIndex = 0;

    // 1. YEARLY
    // Fix: Account for the Next Year page in 'full' scope
    let yearlyCount = 0;
    if (options.scope === 'full') yearlyCount = 2; // Current + Next Year
    else if (options.scope === 'year') yearlyCount = (options.limit || 1);

    currentPageIndex += yearlyCount;

    // 2. OVERVIEW
    const overviewLimit = options.scope === 'full' || options.scope === 'overview' ? (options.limit || 2) : 0;
    // Populate overview indices
    for (let i = 0; i < overviewLimit; i++) {
        context.overviewPageIndices.push(currentPageIndex + i);
    }
    currentPageIndex += overviewLimit;

    // 3. MONTHLY
    if (options.scope === 'full' || options.scope === 'monthly') {
        const limit = options.limit || 12;

        // Extra Page: PREV DEC
        if (options.scope === 'full') {
            context.prevMonthPageIndex = currentPageIndex;
            currentPageIndex++;
        }

        const count = Math.min(12, limit);
        for (let i = 0; i < count; i++) {
            context.monthlyPageIndices.push(currentPageIndex + i);
        }
        currentPageIndex += count;

        // Extra Page: NEXT JAN
        if (options.scope === 'full') {
            context.nextMonthPageIndex = currentPageIndex;
            currentPageIndex++;
        }
    }

    // 4. WEEKLY
    if (options.scope === 'full' || options.scope === 'weekly') {
        // Prev Dec Weeks
        if (options.scope === 'full') {
            let prevDecWeeks = getMonthWeekCount(context.year - 1, 11, context.startDay);

            // Fix: Check for overlap with Main Year Week 1
            // If the last week of Prev Dec is actually the same as Week 1 of Main Year,
            // we should NOT count it in Prev Dec (it belongs to Main Year).

            // Main Year Week 1 Start Date calculation (robust)
            const jan1 = new Date(Date.UTC(context.year, 0, 1));
            const jan1Day = jan1.getUTCDay();
            const startDay = context.startDay;
            let mainYearStart: Date;

            if (startDay === 'Monday') {
                const jan4 = new Date(Date.UTC(context.year, 0, 4));
                const jan4Day = jan4.getUTCDay();
                const diffToMon = (jan4Day + 6) % 7;
                mainYearStart = new Date(Date.UTC(context.year, 0, 4 - diffToMon));
            } else {
                const diffToSun = jan1Day;
                mainYearStart = new Date(Date.UTC(context.year, 0, 1 - diffToSun));
            }

            // Calculate Start Date of the LAST week of Prev Dec
            // We know Prev Dec starts at Week index (TotalWeeks - N)
            // But easier: Calculate start of week for Dec 31 (Year-1)
            const dec31 = new Date(Date.UTC(context.year - 1, 11, 31));
            // Get start of that week
            const dec31Day = dec31.getUTCDay();
            let lastPrevWeekStart: Date;
            if (startDay === 'Monday') {
                // Logic to find Monday of current week
                const diff = (dec31Day + 6) % 7;
                lastPrevWeekStart = new Date(dec31.getTime());
                lastPrevWeekStart.setUTCDate(dec31.getUTCDate() - diff);
            } else {
                const diff = dec31Day;
                lastPrevWeekStart = new Date(dec31.getTime());
                lastPrevWeekStart.setUTCDate(dec31.getUTCDate() - diff);
            }

            // Compare
            if (lastPrevWeekStart.getTime() === mainYearStart.getTime()) {
                prevDecWeeks--;
            }

            for (let i = 0; i < prevDecWeeks; i++) context.prevDecWeeklyPageIndices.push(currentPageIndex + i);
            currentPageIndex += prevDecWeeks;
        }

        const limit = options.limit || context.totalWeeks;
        const count = Math.min(context.totalWeeks, limit);
        for (let i = 0; i < count; i++) {
            context.weeklyPageIndices.push(currentPageIndex + i);
        }
        currentPageIndex += count;

        // Next Jan Weeks
        if (options.scope === 'full') {
            let nextJanWeeks = getMonthWeekCount(context.year + 1, 0, context.startDay);
            let nextJanWeekOffset = 0; // How many weeks to skip (0 or 1)

            // Fix: Check for overlap with Main Year's last week
            // If Week 1 of Next Year starts in December of Main Year,
            // it's already rendered as Main Year's last week - skip it.
            // Use the SAME "Week containing Jan 1" method that the planner uses
            const nextJan1 = new Date(context.year + 1, 0, 1);
            const nextJan1Day = nextJan1.getDay(); // 0=Sun, 1=Mon...
            const targetDay = context.startDay === 'Monday' ? 1 : 0;
            const diff = (nextJan1Day - targetDay + 7) % 7;

            // Week 1 of next year starts this many days before Jan 1
            const nextYearWeek1Start = new Date(context.year + 1, 0, 1 - diff);

            // If Week 1 of Next Year starts in December of Main Year, skip it
            if (nextYearWeek1Start.getFullYear() === context.year && nextYearWeek1Start.getMonth() === 11) {
                nextJanWeeks--;
                nextJanWeekOffset = 1; // Start from Week 2 instead of Week 1
            }

            context.nextJanWeekOffset = nextJanWeekOffset; // Store for rendering
            for (let i = 0; i < nextJanWeeks; i++) context.nextJanWeeklyPageIndices.push(currentPageIndex + i);
            currentPageIndex += nextJanWeeks;
        }
    }

    // 5. DAILY
    if (options.scope === 'full' || options.scope === 'daily') {
        // Prev Dec Days (31)
        if (options.scope === 'full') {
            const prevDecDays = 31;
            for (let i = 0; i < prevDecDays; i++) context.prevDecDailyPageIndices.push(currentPageIndex + i);
            currentPageIndex += prevDecDays;
        }

        const daysInYear = (context.year % 4 === 0 && context.year % 100 !== 0) || context.year % 400 === 0 ? 366 : 365;
        const limit = options.limit || daysInYear;
        const count = Math.min(daysInYear, limit);
        for (let i = 0; i < count; i++) {
            context.dailyPageIndices.push(currentPageIndex + i);
        }
        currentPageIndex += count;

        // Next Jan Days (31)
        if (options.scope === 'full') {
            const nextJanDays = 31;
            for (let i = 0; i < nextJanDays; i++) context.nextJanDailyPageIndices.push(currentPageIndex + i);
            currentPageIndex += nextJanDays;
        }
    }

    // Global Propagate Navigation Tabs
    const navTabsConfig = context.placeholders.monthly.find(p => p.type === 'NAVIGATION_TABS');
    if (navTabsConfig) {
        if (!context.placeholders.weekly.some(p => p.type === 'NAVIGATION_TABS')) {
            context.placeholders.weekly.push(navTabsConfig);
        }
        if (!context.placeholders.daily.some(p => p.type === 'NAVIGATION_TABS')) {
            context.placeholders.daily.push(navTabsConfig);
        }
    }

    const loadTemplate = async (name: string) => {
        const customPath = path.join(process.cwd(), 'public', 'templates', 'custom', name);
        if (fs.existsSync(customPath)) return await PDFDocument.load(fs.readFileSync(customPath));
        const defaultPath = path.join(process.cwd(), 'public', 'templates', name);
        if (fs.existsSync(defaultPath)) return await PDFDocument.load(fs.readFileSync(defaultPath));
        // Fallback or create blank
        const blankDoc = await PDFDocument.create();
        blankDoc.addPage([600, 800]);
        return blankDoc;
    };

    // 1. GENERATE PAGES

    // 1. GENERATE PAGES

    // YEARLY
    if (options.scope === 'full' || options.scope === 'year') {
        const template = await loadTemplate('yearly_template.pdf');

        // Determine how many years to show.
        // If 'full' scope, we show Current Year AND Next Year.
        // If 'year', maybe just current? User req said "For the yearly page, add another page for the next year".
        // Let's assume this applies generally when generating the Yearly section in 'full' mode.
        const yearsToShow = options.scope === 'full' ? 2 : 1;

        // Loop for years
        for (let yOffset = 0; yOffset < yearsToShow; yOffset++) {
            const targetYear = context.year + yOffset;
            const isNextYear = yOffset > 0;

            const limit = options.limit || 1;
            for (let i = 0; i < limit; i++) {
                const [page] = await doc.copyPages(template, [0]);
                doc.addPage(page);

                // Create a temporary context for this page
                // 1. Override year
                // 2. Add isNextYear flag to control link generation in renderers
                const pageContext = {
                    ...context,
                    year: targetYear,
                    isNextYear,
                    // links: isNextYear ? [] : context.links // RESTORED links for global elements
                };

                if (context.placeholders.yearly) {
                    renderPlaceholders(page, context.placeholders.yearly, i, pageContext, 'yearly');
                }

                // Global elements on Next Year page?
                // User said "share same layout". So yes.
                // Links disabled via pageContext.links.
                if (context.placeholders.global) {
                    renderPlaceholders(page, context.placeholders.global, i, pageContext, 'yearly');
                }
            }
        }
    }

    // OVERVIEW
    if (options.scope === 'full' || options.scope === 'overview') {
        const template = await loadTemplate('overview_template.pdf');
        // Default to 2 pages (Jan-Jun, Jul-Dec) if full scope, or trust limit. 
        // If user wants just 1 page, they can specify limit 1, but default behaviour for Overview is usually 2 pages.
        const limit = options.limit || 2;
        for (let i = 0; i < limit; i++) {
            const [page] = await doc.copyPages(template, [0]);
            doc.addPage(page);

            // Context with Month Offset (0 for Pg1, 6 for Pg2, 12 for Pg3...)
            // This allows reusing the same "Month 1-6" layout for "Month 7-12".
            const pageContext = {
                ...context,
                monthOffset: i * 6
            };

            if (context.placeholders.overview) {
                renderPlaceholders(page, context.placeholders.overview, i, pageContext, 'overview');
            }
            if (context.placeholders.global) {
                renderPlaceholders(page, context.placeholders.global, i, pageContext, 'overview');
            }
        }
    }

    // MONTHLY
    if (options.scope === 'full' || options.scope === 'monthly') {
        const template = await loadTemplate('monthly_template.pdf');

        // 1. EXTRA PAGE: PREV DEC
        if (options.scope === 'full') {
            const [page] = await doc.copyPages(template, [0]);
            doc.addPage(page);
            // Context for Prev Dec (Year-1, Month 11)
            const prevDecCtx = {
                ...context,
                year: context.year - 1,
                // Disable links logic? 
                // We typically enable daily links now that we have daily pages.
                skipDailyLinks: false,
                isPrevDec: true
            };
            if (context.placeholders.monthly) {
                renderPlaceholders(page, context.placeholders.monthly, 11, prevDecCtx, 'monthly');
            }
            if (context.placeholders.global) {
                renderPlaceholders(page, context.placeholders.global, 11, prevDecCtx, 'monthly');
            }
        }

        const limit = options.limit || 12;
        for (let i = 0; i < Math.min(12, limit); i++) {
            const [page] = await doc.copyPages(template, [0]);
            doc.addPage(page);
            // Index already pre-calculated
            renderPlaceholders(page, context.placeholders.monthly, i, context, 'monthly');
            if (context.placeholders.global) {
                renderPlaceholders(page, context.placeholders.global, i, context, 'monthly');
            }
        }

        // 2. EXTRA PAGE: NEXT JAN
        if (options.scope === 'full') {
            const [page] = await doc.copyPages(template, [0]);
            doc.addPage(page);
            // Context for Next Jan (Year+1, Month 0)
            const nextJanCtx = {
                ...context,
                year: context.year + 1,
                skipDailyLinks: false,
                isNextJan: true
            };
            if (context.placeholders.monthly) {
                renderPlaceholders(page, context.placeholders.monthly, 0, nextJanCtx, 'monthly');
            }
            if (context.placeholders.global) {
                renderPlaceholders(page, context.placeholders.global, 0, nextJanCtx, 'monthly');
            }
        }
    }

    // WEEKLY
    if (options.scope === 'full' || options.scope === 'weekly') {
        const template = await loadTemplate('weekly_template.pdf');

        // 1. Prev Dec Weeks
        if (options.scope === 'full' && context.prevDecWeeklyPageIndices.length > 0) {
            const pdWeeks = context.prevDecWeeklyPageIndices.length;
            const pdCtx = {
                ...context,
                year: context.year - 1,
                isPrevDec: true,
                skipDailyLinks: false // Enable links, but logic needs to point to Prev Dec Daily
            };

            // Getting start date for "Week 1" of Prev Dec is tricky if we don't know the exact offset.
            // But renderPlaceholders relies on `index` (0..52).
            // We need to map `index` to the correct week of that year.
            // For Prev Dec, we are generating specific weeks (e.g. Week 49-52).
            // We need to pass the ACTUAL week index of that year.
            // Calculation: getWeekNumber(Dec 1, Year-1).
            // Let's assume the loop runs for N weeks. The weeks are likely [StartWeek .. EndWeek].
            // We need to calculate the starting week index for the loop.
            // Start calculation for Prev Dec
            const dec1 = new Date(context.year - 1, 11, 1);
            // getWeekNumber returns 1-based week number
            const startWeekNum = getWeekNumber(dec1, context.startDay as any);
            const startWeekIndex = startWeekNum - 1; // 0-based conversion

            for (let i = 0; i < pdWeeks; i++) {
                const [page] = await doc.copyPages(template, [0]);
                doc.addPage(page);
                renderPlaceholders(page, context.placeholders.weekly, i + startWeekIndex, pdCtx, 'weekly');
                if (context.placeholders.global) renderPlaceholders(page, context.placeholders.global, i + startWeekIndex, pdCtx, 'weekly');
            }
        }

        const limit = options.limit || context.totalWeeks;
        for (let i = 0; i < Math.min(context.totalWeeks, limit); i++) {
            const [page] = await doc.copyPages(template, [0]);
            doc.addPage(page);
            // Index pre-calculated
            renderPlaceholders(page, context.placeholders.weekly, i, context, 'weekly');
            if (context.placeholders.global) {
                renderPlaceholders(page, context.placeholders.global, i, context, 'weekly');
            }
        }

        // 2. Next Jan Weeks
        if (options.scope === 'full' && context.nextJanWeeklyPageIndices.length > 0) {
            const njWeeks = context.nextJanWeeklyPageIndices.length;
            const njCtx = {
                ...context,
                year: context.year + 1,
                isNextJan: true,
                skipDailyLinks: false
            };
            // Use nextJanWeekOffset to skip Week 1 if it's part of main year
            const weekOffset = context.nextJanWeekOffset || 0;
            for (let i = 0; i < njWeeks; i++) {
                const [page] = await doc.copyPages(template, [0]);
                doc.addPage(page);
                // Pass i + weekOffset so Week 2+ is rendered when Week 1 is skipped
                renderPlaceholders(page, context.placeholders.weekly, i + weekOffset, njCtx, 'weekly');
                if (context.placeholders.global) renderPlaceholders(page, context.placeholders.global, i + weekOffset, njCtx, 'weekly');
            }
        }
    }

    // DAILY
    if (options.scope === 'full' || options.scope === 'daily') {
        const template = await loadTemplate('daily_template.pdf');

        // 1. Prev Dec Days (31 days) -> Dec 1 to Dec 31
        if (options.scope === 'full' && context.prevDecDailyPageIndices.length > 0) {
            const pdDays = context.prevDecDailyPageIndices.length; // 31
            const pdCtx = {
                ...context,
                year: context.year - 1,
                isPrevDec: true
            };
            // We need to render Dec 1 .. Dec 31.
            // renderPlaceholders 'daily' scope expects `index` = dayOfYear (0..364).
            // Dec 1 is day ~334.
            // We must calculate the dayOfYear index for Dec 1 of Year-1.
            const jan1 = new Date(context.year - 1, 0, 1);
            const dec1 = new Date(context.year - 1, 11, 1);
            const startDayIndex = Math.floor((dec1.getTime() - jan1.getTime()) / (1000 * 60 * 60 * 24));

            for (let i = 0; i < pdDays; i++) {
                const [page] = await doc.copyPages(template, [0]);
                doc.addPage(page);
                renderPlaceholders(page, context.placeholders.daily, startDayIndex + i, pdCtx, 'daily');
                if (context.placeholders.global) renderPlaceholders(page, context.placeholders.global, startDayIndex + i, pdCtx, 'daily');
            }
        }

        const daysInYear = (context.year % 4 === 0 && context.year % 100 !== 0) || context.year % 400 === 0 ? 366 : 365;
        const limit = options.limit || daysInYear;

        const count = Math.min(daysInYear, limit);
        for (let i = 0; i < count; i++) {
            const [page] = await doc.copyPages(template, [0]);
            doc.addPage(page);
            renderPlaceholders(page, context.placeholders.daily, i, context, 'daily');
            if (context.placeholders.global) {
                renderPlaceholders(page, context.placeholders.global, i, context, 'daily');
            }
        }

        // 2. Next Jan Days (31 days) -> Jan 1 to Jan 31
        if (options.scope === 'full' && context.nextJanDailyPageIndices.length > 0) {
            const njDays = 31;
            const njCtx = {
                ...context,
                year: context.year + 1,
                isNextJan: true
            };
            // Jan 1 is index 0.
            for (let i = 0; i < njDays; i++) {
                const [page] = await doc.copyPages(template, [0]);
                doc.addPage(page);
                renderPlaceholders(page, context.placeholders.daily, i, njCtx, 'daily');
                if (context.placeholders.global) renderPlaceholders(page, context.placeholders.global, i, njCtx, 'daily');
            }
        }
    }

    // EXTRAS (Sub Pages)
    // Only if scope is full? Or always? Let's check config.
    if (options.scope === 'full' && options.extras) {
        // Helper to generate extras
        const generateExtra = async (type: 'grid' | 'dot' | 'line' | 'blank', count: number) => {
            if (count <= 0) return;
            // Try load specific template, else fallback to blank or generic
            let tplName = `${type}_template.pdf`;
            // Logic to use custom template if provided? 
            // For now assume files exist in public/templates/custom/ or default

            let template;
            try {
                template = await loadTemplate(tplName);
            } catch (e) {
                // Fallback to blank if specific not found? Or error.
                // Assuming they exist.
                console.warn(`Template ${tplName} not found, skipping extras.`);
                return;
            }

            for (let i = 0; i < count; i++) {
                const [page] = await doc.copyPages(template, [0]);
                doc.addPage(page);

                // Store index
                context.extraPageIndices[type].push(doc.getPageCount() - 1);

                // Render Global Elements on Extras?
                // Usually yes, navigation tabs should appear.
                // What is the scope? 'extras'?
                // Navigation highlight might be tricky. Usually extras don't highlight a month, or highlight specific tab?
                // Let's pass 'extras' as scope.
                if (context.placeholders.global) {
                    renderPlaceholders(page, context.placeholders.global, 0, context, 'extras');
                }
            }
        };

        if (options.extras.grid) await generateExtra('grid', options.extras.grid.count);
        if (options.extras.dot) await generateExtra('dot', options.extras.dot.count);
        if (options.extras.line) await generateExtra('line', options.extras.line.count);
        if (options.extras.blank) await generateExtra('blank', options.extras.blank.count);
    }

    // 2. APPLY HYPERLINKS
    applyHyperlinks(context);

    return await doc.save();
}

function renderPlaceholders(
    page: PDFPage,
    placeholders: PlaceholderConfig[],
    index: number, // montIdx(0-11) OR weekNum(1-52) OR dayOfYear(0-364)
    ctx: any,
    scope: 'yearly' | 'overview' | 'monthly' | 'weekly' | 'daily' | 'extras'
) {
    const { year, startDay, font: regularFont, boldFont, lightFont, thinFont, mediumFont } = ctx;
    const height = page.getHeight();

    placeholders.forEach(ph => {
        const x = ph.x;
        const y = ph.y;
        const fontSize = ph.style?.fontSize || 12;
        // Fix 8px vertical shift: Subtract fontSize (roughly) to move baseline down, so top of text matches HTML top
        const pdfY = height - y - (fontSize * 0.8);
        const pdfX = x;

        const fontToUse = ph.style?.font === 'Roboto-Bold' ? boldFont : (ph.style?.font === 'Roboto-Light' ? lightFont : (ph.style?.font === 'Roboto-Thin' ? thinFont : regularFont));
        // fontSize already defined above
        const textTransform = ph.style?.textTransform || 'none';
        const align = ph.style?.align || 'left';
        const letterSpacing = ph.style?.letterSpacing || 0;
        const color = rgb(0, 0, 0); // User requested removing color props, forcing black

        // --- NAVIGATION TABS ---
        // --- NAVIGATION TABS ---
        if (ph.type === 'NAVIGATION_TABS') {
            const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            const w = ph.grid?.width || 30;
            const h = ph.grid?.height || 20; // Height of one month tab
            // User requested height = 23px for these buttons
            const btnHeight = 23;
            const startY = pdfY; // Top anchor

            // 1. TOP BUTTON ("12") - Prev Dec
            const topBtnActive = ctx.year < ctx.plannerYear;
            const topBtnY = startY;

            // Draw background
            page.drawRectangle({
                x: pdfX,
                y: topBtnY - btnHeight, // bottom-left
                width: w,
                height: btnHeight,
                color: topBtnActive ? rgb(0, 0, 0) : rgb(1, 1, 1),
                borderColor: rgb(0, 0, 0),
                borderWidth: 0.5
            });
            // Draw Text "12" (Horizontal)
            drawTextWithKerning(page, "12", {
                x: pdfX + (w - fontToUse.widthOfTextAtSize("12", fontSize)) / 2,
                y: topBtnY - (btnHeight / 2) - (fontSize / 2.5),
                size: fontSize,
                font: fontToUse,
                color: topBtnActive ? rgb(1, 1, 1) : color
            });
            // Link to Prev Dec
            if (ctx.prevMonthPageIndex >= 0) {
                ctx.links.push({
                    pageIndex: ctx.doc.getPageCount() - 1,
                    rect: [pdfX, topBtnY - btnHeight, pdfX + w, topBtnY],
                    targetType: 'PREV_DEC'
                });
            }

            // 2. MIDDLE (12 MONTHS)
            // They start BELOW the top button.
            // Loop 0..11
            const monthsStartY = topBtnY - btnHeight;

            for (let m = 0; m < 12; m++) {
                // Determine highlight
                let isActive = false;
                // Only highlight if current page year matches Planner Year
                if (ctx.year === ctx.plannerYear) {
                    if (scope === 'monthly' && index === m) isActive = true;
                    if (scope === 'daily') {
                        const date = new Date(year, 0, 1);
                        date.setDate(date.getDate() + index);
                        if (date.getMonth() === m) isActive = true;
                    }
                    if (scope === 'weekly') {
                        // Logic: Find the "Start Day" of the week
                        const jan1 = new Date(year, 0, 1);
                        const currentDay = jan1.getDay(); // 0=Sun, 1=Mon...
                        const targetDay = startDay === 'Monday' ? 1 : 0;
                        let diff = (currentDay - targetDay + 7) % 7;
                        const firstWeekStart = new Date(year, 0, 1 - diff);
                        const currentWeekStart = new Date(firstWeekStart);
                        currentWeekStart.setDate(currentWeekStart.getDate() + (index * 7));
                        // Use middle of week
                        const middleOfWeek = new Date(currentWeekStart);
                        middleOfWeek.setDate(middleOfWeek.getDate() + 3);

                        // FIX: Week 1 of Main Year should always highlight JAN (m=0),
                        // even if the middle of the week is in Dec of previous year (e.g. 2027).
                        if (index === 0 && m === 0) isActive = true;
                        else if (middleOfWeek.getFullYear() === year && middleOfWeek.getMonth() === m) isActive = true;
                    }
                }

                const cellY = monthsStartY - (m * h); // Top of the cell

                // Draw Background
                page.drawRectangle({
                    x: pdfX,
                    y: cellY - h,
                    width: w,
                    height: h,
                    color: isActive ? rgb(0, 0, 0) : rgb(1, 1, 1),
                    borderColor: rgb(0, 0, 0),
                    borderWidth: 0.5
                });

                // Text (Rotated 270 deg / -90 deg -> Bottom to Top reading? Or 90?)
                // Standard for side tabs is often reading "Up".
                // top-left -> bottom-left (reading down)?
                // User didn't specify rotation for months explicitly in prompt, but implied they ARE rotated.
                // Previously logic used 90 deg. Let's stick to 90 deg (Bottom-to-Top).
                // Center text
                const text = months[m];
                const textWidth = fontToUse.widthOfTextAtSize(text, fontSize);

                // For 90 deg rotation: x is baseline roughly horizontal pos, y is baseline vertical pos.
                // We want effective center.
                // X center: pdfX + w/2 + fontSize/3 (baseline adjust)
                // Y center: cellY - h/2 - textWidth/2.

                page.drawText(text, {
                    x: pdfX + (w / 2) + (fontSize / 3),
                    y: cellY - (h / 2) - (textWidth / 2),
                    size: fontSize,
                    font: fontToUse,
                    color: isActive ? rgb(1, 1, 1) : color,
                    rotate: degrees(90)
                });

                // Link
                if (ctx.monthlyPageIndices && ctx.monthlyPageIndices.length > m) {
                    ctx.links.push({
                        pageIndex: ctx.doc.getPageCount() - 1,
                        rect: [pdfX, cellY - h, pdfX + w, cellY],
                        targetType: 'MONTH',
                        targetId: m
                    });
                }
            }

            // 3. BOTTOM BUTTON ("1") - Next Jan
            const bottomBtnActive = ctx.year > ctx.plannerYear; // Assuming Next Jan page has year + 1
            const bottomBtnY = monthsStartY - (12 * h); // Top of bottom button

            // Draw background
            page.drawRectangle({
                x: pdfX,
                y: bottomBtnY - btnHeight,
                width: w,
                height: btnHeight,
                color: bottomBtnActive ? rgb(0, 0, 0) : rgb(1, 1, 1),
                borderColor: rgb(0, 0, 0),
                borderWidth: 0.5
            });
            // Draw Text "1" (Horizontal)
            drawTextWithKerning(page, "1", {
                x: pdfX + (w - fontToUse.widthOfTextAtSize("1", fontSize)) / 2,
                y: bottomBtnY - (btnHeight / 2) - (fontSize / 2.5),
                size: fontSize,
                font: fontToUse,
                color: bottomBtnActive ? rgb(1, 1, 1) : color
            });
            // Link to Next Jan
            if (ctx.nextMonthPageIndex >= 0) {
                ctx.links.push({
                    pageIndex: ctx.doc.getPageCount() - 1,
                    rect: [pdfX, bottomBtnY - btnHeight, pdfX + w, bottomBtnY],
                    targetType: 'NEXT_JAN'
                });
            }
        }

        // VERTICAL_MONTH_GRID (Overview) - MOVED HERE
        if (ph.type === 'VERTICAL_MONTH_GRID') {
            // Parse Month from Label if possible (1-12), else use context monthIndex or default 0
            let targetMonthIndex = 0; // Default to Jan
            if (scope === 'overview') targetMonthIndex = index; // If index passed is month (unlikely for overview loop which is size 1)
            // Actually Overview loop passes i=0. So default 0 is mostly correct if no label.

            if (ph.label && !isNaN(parseInt(ph.label))) {
                targetMonthIndex = parseInt(ph.label) - 1;
            }

            // Apply Month Offset for Multi-Page Overview (e.g. Page 2 is +6 months)
            if (ctx.monthOffset) {
                targetMonthIndex += ctx.monthOffset;
            }

            // Safety: If month > 12 (or 11 index), what to do?
            // User might have 20 months spread?
            // If it exceeds year boundary, Date object handles it (e.g. Month 13 is Jan next year).
            // But if we want to limit to current year?
            // "Generate July to Dec".
            // If user has Month 1-6 on layout.
            // Pg 1: 1-6.
            // Pg 2: 7-12.
            // Works perfectly.

            const start = new Date(year, targetMonthIndex, 1);
            const end = new Date(year, targetMonthIndex + 1, 0); // Last day of month
            const daysInMonth = end.getDate();

            const w = ph.grid?.width || 15;
            const h = ph.grid?.height || 15;
            const gapX = ph.grid?.paddingX || 0;
            const gapY = ph.grid?.paddingY || 0;

            const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // 0=Sun .. 6=Sat

            for (let d = 1; d <= daysInMonth; d++) {
                const dateObj = new Date(year, targetMonthIndex, d);
                const dayOfWeek = dateObj.getDay(); // 0=Sun, 1=Mon...

                const isSat = dayOfWeek === 6;
                const isSun = dayOfWeek === 0;

                // Check for holiday
                let isHolidayDate = false;
                const holidaySettings = ctx.holidaySettings;
                if (holidaySettings?.countryCode) {
                    const holiday = isHoliday(dateObj, holidaySettings.countryCode, {
                        showPublic: holidaySettings.showPublic !== false,
                        showBank: holidaySettings.showBank !== false,
                        showObservance: holidaySettings.showObservance === true
                    });
                    if (holiday) isHolidayDate = true;
                }

                const r = d - 1; // Row 0-30
                const yPos = pdfY - (r * (h + gapY)); // Downwards

                // --- Left Column: Date ---
                const xDate = pdfX;

                // Background
                if (isSat) {
                    page.drawRectangle({
                        x: xDate, y: yPos, width: w, height: h,
                        color: rgb(0.6, 0.6, 0.6)
                    });
                } else if (isSun) {
                    page.drawRectangle({
                        x: xDate, y: yPos, width: w, height: h,
                        color: rgb(0, 0, 0)
                    });
                }

                // Text Color - holidays are red (unless Sat/Sun with bg)
                let dateColor = color;
                if (isSat || isSun) {
                    dateColor = rgb(1, 1, 1); // White on bg
                } else if (isHolidayDate) {
                    dateColor = rgb(0.8, 0.1, 0.1); // Red for holidays
                }

                // Draw Date
                const dateStr = d.toString();
                const dateWidth = fontToUse.widthOfTextAtSize(dateStr, fontSize);
                const dateX = xDate + (w - dateWidth) / 2;
                const textY = yPos + (h - fontSize) / 2 + 1;

                drawTextWithKerning(page, dateStr, {
                    x: dateX, y: textY, size: fontSize, font: fontToUse, color: dateColor, letterSpacing
                });

                // Link Date to Daily Page
                if (!ctx.isNextYear) {
                    const currentUTC = Date.UTC(year, targetMonthIndex, d);
                    const jan1UTC = Date.UTC(year, 0, 1);
                    const dayOfYearIndex = Math.floor((currentUTC - jan1UTC) / (1000 * 60 * 60 * 24));

                    if (ctx.dailyPageIndices && ctx.dailyPageIndices.length > dayOfYearIndex) {
                        ctx.links.push({
                            pageIndex: ctx.doc.getPageCount() - 1, // Current page
                            rect: [xDate, yPos, xDate + w, yPos + h],
                            targetType: 'DAY',
                            targetId: dayOfYearIndex
                        });
                    }
                }

                // --- Right Column: Day ---
                const xDay = pdfX + w + gapX;
                const dayLabel = labels[dayOfWeek];
                const dayWidth = fontToUse.widthOfTextAtSize(dayLabel, fontSize);
                const dayX = xDay + (w - dayWidth) / 2;

                drawTextWithKerning(page, dayLabel, {
                    x: dayX, y: textY, size: fontSize, font: fontToUse, color, letterSpacing
                });
            }
        }

        // --- MONTH_NAME (Overview page - 6 month names in a row) ---
        if (ph.type === 'MONTH_NAME' && scope === 'overview') {
            const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

            // Determine starting month based on label (1 = Jan-Jun, 7 = Jul-Dec) or monthOffset
            let startMonth = 0;
            if (ph.label && !isNaN(parseInt(ph.label))) {
                startMonth = parseInt(ph.label) - 1; // Label "1" = Jan (index 0), "7" = Jul (index 6)
            }
            if (ctx.monthOffset) {
                startMonth += ctx.monthOffset;
            }

            const grid = ph.grid || { cols: 6, rows: 1, width: 80, height: 20, paddingX: 5, paddingY: 0 };

            for (let i = 0; i < grid.cols; i++) {
                const monthIndex = (startMonth + i) % 12;
                const monthName = months[monthIndex];

                const cellX = pdfX + (i * (grid.width + grid.paddingX));
                const cellY = pdfY;

                // Center text in cell
                const textWidth = fontToUse.widthOfTextAtSize(monthName, fontSize);
                const textX = cellX + (grid.width - textWidth) / 2;
                const textY = cellY - fontSize + 2;

                drawTextWithKerning(page, monthName, {
                    x: textX,
                    y: textY,
                    size: fontSize,
                    font: fontToUse,
                    color,
                    letterSpacing
                });
            }
        }

        // --- MONTH LABEL ---
        if (ph.type === 'MONTH_LABEL') {
            if (scope === 'monthly') {
                const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                let text = months[index];
                if (textTransform === 'uppercase') text = text.toUpperCase();

                let drawX = pdfX;
                if (align === 'center') {
                    const textWidth = fontToUse.widthOfTextAtSize(text, fontSize) + (text.length - 1) * letterSpacing;
                    drawX -= (textWidth / 2);
                } else if (align === 'right') {
                    const textWidth = fontToUse.widthOfTextAtSize(text, fontSize) + (text.length - 1) * letterSpacing;
                    drawX -= textWidth;
                }

                drawTextWithKerning(page, text, { x: drawX, y: pdfY, size: fontSize, font: fontToUse, color, letterSpacing });
            }
            if (scope === 'weekly') {
                // Determine month of the week
                // Need robust week logic...
                // Simplified: Just use string "Month"
            }
        }

        // --- WEEK NUMBER ---
        if (ph.type === 'WEEK_NUMBER') {
            // MONTHLY SCOPE: Grid of weeks
            if (scope === 'monthly') {
                const start = new Date(year, index, 1);
                const end = new Date(year, index + 1, 0);
                const weeks = new Set<number>();
                for (let d = 1; d <= end.getDate(); d += 7) { // Check every week roughly
                    const date = new Date(year, index, d);
                    weeks.add(getWeekNumber(date, startDay));
                }
                // Also check last day to be safe
                weeks.add(getWeekNumber(end, startDay));

                const weekNums = Array.from(weeks);

                const grid = ph.grid || { cols: 1, rows: 6, width: 30, height: 20, paddingX: 2, paddingY: 2 };

                weekNums.forEach((wk, i) => {
                    if (i >= (grid.cols * grid.rows)) return;

                    const r = Math.floor(i / grid.cols);
                    const c = i % grid.cols;

                    const cellX = pdfX + (c * (grid.width + grid.paddingX));
                    const cellY = pdfY - (r * (grid.height + grid.paddingY));

                    // Calculate center of the cell
                    const centerX = cellX + (grid.width / 2);
                    const centerY = cellY - (grid.height / 2); // logic uses top-left origin for cellY calculation relative to pdfY

                    // Define 15x15 square centered
                    const squareSize = 15;
                    const squareX = centerX - (squareSize / 2);
                    const squareY = centerY - (squareSize / 2); // Bottom-left of the square for drawRectangle?
                    // pdf-lib drawRectangle x,y is bottom-left.
                    // cellY is top of the row.
                    // centerY is roughly middle of the row height.

                    // Check y coordinate system.
                    // pdfY = height - y. (Top-down input to bottom-up PDF)
                    // cellY = pdfY - (r * ...). So cellY is the top of the current cell.
                    // We want the square to be centered in the cell height (grid.height).
                    // Center of cell in Y (from bottom) = cellY - (grid.height / 2).
                    // Bottom of square = (cellY - grid.height / 2) - (squareSize / 2).

                    const rectX = cellX + (grid.width - squareSize) / 2;
                    const rectY = cellY - (grid.height / 2) - (squareSize / 2);

                    // Draw 15x15 Square (40% black = 0.6 white? Or 0.4 gray? "40% black" usually means 40% opacity of black on white, or 40% K.
                    // 40% black -> 0.4 black -> 0.6 white.
                    // But in RGB: 0 is black, 1 is white.
                    // 40% black is often interpreted as 40% gray (0.4, 0.4, 0.4) or 60% gray (0.6, 0.6, 0.6).
                    // "40% black" typically means 40% tint of black. So 60% white. (0.6, 0.6, 0.6).
                    // Let's assume rgb(0.6, 0.6, 0.6) for now, or rgb(0,0,0) with opacity if supported (pdf-lib supports opacity).
                    // User said "40% black as the background".
                    // Let's use rgb(0.6, 0.6, 0.6) for "40% black" (visually gray).
                    // Or actually, usually "10% black" is light gray, "90% black" is dark gray.
                    // So "40% black" is rgb(0.6, 0.6, 0.6).

                    page.drawRectangle({
                        x: rectX,
                        y: rectY,
                        width: squareSize,
                        height: squareSize,
                        color: rgb(0.6, 0.6, 0.6), // 40% black equivalent
                    });

                    // Draw White Text Centered in Square
                    // Use dynamic letterSpacing
                    const textWidth = fontToUse.widthOfTextAtSize(`${wk}`, fontSize) + ((`${wk}`.length - 1) * letterSpacing);
                    // Re-center text in the square
                    const textX = rectX + (squareSize - textWidth) / 2;
                    const textY = rectY + (squareSize / 2) - (fontSize / 2.5); // visually centered

                    drawTextWithKerning(page, `${wk}`, {
                        x: textX,
                        y: textY,
                        size: fontSize,
                        font: fontToUse,
                        color: rgb(1, 1, 1),
                        letterSpacing
                    });

                    // Link to Weekly Page - RESTRICTED TO SQUARE
                    let tType = 'WEEK';
                    let tId = wk - 1; // Default 0-indexed for Main Year

                    if (ctx.isPrevDec) {
                        tType = 'PREV_DEC_WEEK';
                        // Normalize: wk is e.g. 48. Array starts at 0.
                        // Calculate start week of this month (Dec)
                        const dec1 = new Date(year, 11, 1);
                        const startW = getWeekNumber(dec1, startDay);
                        tId = wk - startW;
                    } else if (ctx.isNextJan) {
                        tType = 'NEXT_JAN_WEEK';
                        const jan1 = new Date(year, 0, 1);
                        const startW = getWeekNumber(jan1, startDay);
                        tId = wk - startW;
                    }

                    if (tId >= 0) {
                        ctx.links.push({
                            pageIndex: ctx.doc.getPageCount() - 1,
                            rect: [rectX, rectY, rectX + squareSize, rectY + squareSize],
                            targetType: tType,
                            targetId: tId
                        });
                    }
                });
            } else {
                // DAILY / WEEKLY SINGLE NUMBER
                let weekNum = 0;
                if (scope === 'weekly') weekNum = index;
                if (scope === 'daily') {
                    const date = new Date(year, 0, 1);
                    date.setDate(date.getDate() + index);
                    weekNum = getWeekNumber(date, startDay);
                }

                if (weekNum > 0) {
                    drawTextWithKerning(page, `${weekNum}`, { x: pdfX, y: pdfY, size: fontSize, font: fontToUse, color, letterSpacing });
                    // Link to Weekly Page
                }
            }
        }
        // --- DAILY / WEEKLY NUMBER LOGIC ---
        // (This block was incorrectly placed or the previous braces were messed up)
        // It seems this block logic depends on 'ph' which is not available if loop closed.
        // Actually, the previous VIEW showed the loop starts at line 204.
        // The error log shows 'ph' is not defined in many subsequent blocks.
        // This implies the loop closed prematurely.


        // --- DAILY DATE & DAY ---
        if (scope === 'daily') {
            const date = new Date(year, 0, 1);
            date.setDate(date.getDate() + index);

            if (ph.type === 'DAILY_DATE') {
                let text = date.getDate().toString();
                let drawX = pdfX;
                if (align === 'center') {
                    const textWidth = fontToUse.widthOfTextAtSize(text, fontSize) + (text.length - 1) * letterSpacing;
                    drawX -= (textWidth / 2);
                } else if (align === 'right') {
                    const textWidth = fontToUse.widthOfTextAtSize(text, fontSize) + (text.length - 1) * letterSpacing;
                    drawX -= textWidth;
                }

                // Check for holiday
                const holidaySettings = ctx.holidaySettings;
                let holiday: Holiday | null = null;
                if (holidaySettings?.countryCode) {
                    holiday = isHoliday(date, holidaySettings.countryCode, {
                        showPublic: holidaySettings.showPublic !== false,
                        showBank: holidaySettings.showBank !== false,
                        showObservance: holidaySettings.showObservance === true
                    });
                }

                // Use red color for holiday dates
                const dateColor = holiday ? rgb(0.8, 0.1, 0.1) : color;

                drawTextWithKerning(page, text, { x: drawX, y: pdfY, size: fontSize, font: fontToUse, color: dateColor, letterSpacing });
                // Holiday name is now rendered separately via DAILY_HOLIDAY placeholder
            }
            if (ph.type === 'DAILY_DAY') {
                let text = date.toLocaleDateString('en-US', { weekday: 'long' });
                if (textTransform === 'uppercase') text = text.toUpperCase();

                let drawX = pdfX;
                if (align === 'center') {
                    const textWidth = fontToUse.widthOfTextAtSize(text, fontSize) + (text.length - 1) * letterSpacing;
                    drawX -= (textWidth / 2);
                } else if (align === 'right') {
                    const textWidth = fontToUse.widthOfTextAtSize(text, fontSize) + (text.length - 1) * letterSpacing;
                    drawX -= textWidth;
                }

                drawTextWithKerning(page, text, { x: drawX, y: pdfY, size: fontSize, font: fontToUse, color, letterSpacing });
            }
            if (ph.type === 'DAILY_QUOTE') {
                // Static quote or random list
                const text = "Believe in yourself.";
                let drawX = pdfX;
                if (align === 'center') {
                    const textWidth = fontToUse.widthOfTextAtSize(text, fontSize) + (text.length - 1) * letterSpacing;
                    drawX -= (textWidth / 2);
                } else if (align === 'right') {
                    const textWidth = fontToUse.widthOfTextAtSize(text, fontSize) + (text.length - 1) * letterSpacing;
                    drawX -= textWidth;
                }
                drawTextWithKerning(page, text, { x: drawX, y: pdfY, size: fontSize, font: fontToUse, color, letterSpacing });
            }

            // --- DAILY_HOLIDAY: Pill-shaped red background with white text ---
            if (ph.type === 'DAILY_HOLIDAY') {
                // Check for holiday
                const holidaySettings = ctx.holidaySettings;
                let holiday: Holiday | null = null;
                if (holidaySettings?.countryCode) {
                    holiday = isHoliday(date, holidaySettings.countryCode, {
                        showPublic: holidaySettings.showPublic !== false,
                        showBank: holidaySettings.showBank !== false,
                        showObservance: holidaySettings.showObservance === true
                    });
                }

                if (holiday) {
                    // Select appropriate CJK font based on country code
                    let holidayFont = boldFont; // Default fallback
                    let isCJK = false; // Track if using CJK font for position adjustment
                    const countryCode = holidaySettings?.countryCode?.toUpperCase();
                    if (countryCode === 'JP') {
                        holidayFont = ctx.notoSansJP || boldFont;
                        isCJK = true;
                    } else if (countryCode === 'KR') {
                        holidayFont = ctx.notoSansKR || boldFont;
                        isCJK = true;
                    } else if (countryCode === 'CN') {
                        holidayFont = ctx.notoSansSC || boldFont; // Simplified Chinese for China
                        isCJK = true;
                    } else if (countryCode === 'TW' || countryCode === 'HK') {
                        holidayFont = ctx.notoSansTC || boldFont; // Traditional Chinese for Taiwan/HK
                        isCJK = true;
                    } else {
                        // For non-CJK countries, use Roboto Bold
                        holidayFont = boldFont;
                    }

                    // Use centralized abbreviation function
                    let holidayName = getHolidayDisplayName(holiday.name).toUpperCase();

                    if (holidayName.length > 0) {
                        const pillH = ph.grid?.height || 20;
                        const pillPadding = 12;
                        const holidayFontSize = fontSize || 10;

                        // Calculate text width to auto-size pill
                        const textWidth = holidayFont.widthOfTextAtSize(holidayName, holidayFontSize);
                        const pillW = textWidth + (pillPadding * 2);
                        const pillRadius = pillH / 2;

                        // Position - use placeholder position as center
                        let pillX = pdfX;
                        if (align === 'center') {
                            pillX -= (pillW / 2);
                        } else if (align === 'right') {
                            pillX -= pillW;
                        }
                        const pillY = pdfY - pillH;

                        const fillColor = rgb(0.8, 0.15, 0.15); // Red

                        // Draw filled pill using circles + rectangle
                        // Left semicircle
                        const leftCenterX = pillX + pillRadius;
                        const leftCenterY = pillY + pillRadius;

                        // Right semicircle
                        const rightCenterX = pillX + pillW - pillRadius;
                        const rightCenterY = pillY + pillRadius;

                        // Draw left half-circle (filled)
                        page.drawCircle({
                            x: leftCenterX,
                            y: leftCenterY,
                            size: pillRadius,
                            color: fillColor
                        });

                        // Draw right half-circle (filled)
                        page.drawCircle({
                            x: rightCenterX,
                            y: rightCenterY,
                            size: pillRadius,
                            color: fillColor
                        });

                        // Draw center rectangle (connects the two circles)
                        page.drawRectangle({
                            x: leftCenterX,
                            y: pillY,
                            width: rightCenterX - leftCenterX,
                            height: pillH,
                            color: fillColor
                        });

                        // Draw white text centered in pill
                        // PDF text baseline is at bottom, so offset by ~25% of font height for visual center
                        // CJK fonts need +2px right adjustment (so -1px total), Latin fonts use -3px
                        const textXOffset = isCJK ? -1 : -3;
                        const textX = pillX + (pillW - textWidth) / 2 + textXOffset;
                        const textY = pillY + (pillH / 2) - (holidayFontSize * 0.35);

                        drawTextWithKerning(page, holidayName, {
                            x: textX,
                            y: textY,
                            size: holidayFontSize,
                            font: holidayFont,
                            color: rgb(1, 1, 1), // White
                            letterSpacing: 0.5
                        });
                    }
                }
            }
        }

        // --- YEAR LABEL ---
        if (ph.type === 'YEAR_LABEL') {
            const text = year.toString();
            let drawX = pdfX;
            if (ph.style?.align === 'center') {
                const textWidth = fontToUse.widthOfTextAtSize(text, fontSize);
                drawX -= (textWidth / 2);
            } else if (ph.style?.align === 'right') {
                const textWidth = fontToUse.widthOfTextAtSize(text, fontSize) + (text.length - 1) * letterSpacing;
                drawX -= textWidth;
            }
            drawTextWithKerning(page, text, { x: drawX, y: pdfY, size: fontSize, font: fontToUse, color, letterSpacing });
        }

        // --- MINI CALENDAR INSTANCE ---
        if (ph.type === 'MINI_CALENDAR_INSTANCE') {
            // Get the blueprint
            const blueprint = ctx.placeholders.mini || [];
            if (blueprint.length === 0) return;

            let targetMonthIndex = parseInt(ph.label) - 1; // 0-based
            if (isNaN(targetMonthIndex)) targetMonthIndex = 0; // Default Jan

            // Render the blueprint at this location
            blueprint.forEach((item: PlaceholderConfig) => {
                // Instance Y (ph.y) is from top.
                // Item Y (item.y) is from top of component.
                // Absolute Top Y = ph.y + item.y.

                // We'll Create a temp placeholder object shifted by position
                const shiftedPh = {
                    ...item,
                    x: ph.x + item.x,
                    y: ph.y + item.y
                };

                let highlightDate: Date | undefined = undefined;

                if (scope === 'weekly') {
                    // Calculate Week Start Date (Same logic as before)
                    const jan1 = new Date(Date.UTC(year, 0, 1));
                    const jan1Day = jan1.getUTCDay();
                    let firstWeekStart;
                    if (startDay === 'Monday') {
                        const jan4 = new Date(Date.UTC(year, 0, 4));
                        const jan4Day = jan4.getUTCDay();
                        const diffToMon = (jan4Day + 6) % 7;
                        firstWeekStart = new Date(Date.UTC(year, 0, 4 - diffToMon));
                    } else {
                        const diffToSun = jan1Day;
                        firstWeekStart = new Date(Date.UTC(year, 0, 1 - diffToSun));
                    }

                    const weekDate = new Date(firstWeekStart);
                    weekDate.setUTCDate(weekDate.getUTCDate() + (index * 7));

                    highlightDate = new Date(weekDate.getUTCFullYear(), weekDate.getUTCMonth(), weekDate.getUTCDate());

                    // Dynamic Month Selection:
                    // If the week ends in Month M+1, show Month M+1.
                    // Calculate Week End Date
                    const weekEnd = new Date(highlightDate);
                    weekEnd.setDate(weekEnd.getDate() + 6);

                    const m = weekEnd.getMonth();
                    const y = weekEnd.getFullYear();
                    const diffYears = y - year;

                    targetMonthIndex = m + (diffYears * 12);
                }

                // Call specific mini-renderer
                renderMiniItem(page, shiftedPh, targetMonthIndex, ctx, scope, 0, 0, highlightDate);
            });
        }

        // --- MINI CALENDAR NEXT MONTH (Monthly Scope) ---
        if (ph.type === 'MINI_CALENDAR_NEXT_MONTH' && scope === 'monthly') {
            const blueprint = ctx.placeholders.mini || [];
            if (blueprint.length === 0) return;

            // Calculate Next Month
            // index is current month index (0-11)
            let targetMonthIndex = index + 1;
            let targetYear = year;

            if (targetMonthIndex > 11) {
                targetMonthIndex = 0; // Jan
                targetYear += 1; // Next Year
            }

            // Logic for Prev Dec and Next Jan pages
            if (ctx.isPrevDec) {
                // Current is Dec (Year-1). Next is Jan (Year).
                targetMonthIndex = 0;
                targetYear = ctx.year + 1; // == Planner Year
            } else if (ctx.isNextJan) {
                // Current is Jan (Year+1). Next is Feb (Year+1).
                targetMonthIndex = 1;
                targetYear = ctx.year; // Year is already +1
            }

            blueprint.forEach((item: PlaceholderConfig) => {
                const shiftedPh = { ...item, x: ph.x + item.x, y: ph.y + item.y };
                // Pass targetYear to renderer
                renderMiniItem(page, shiftedPh, targetMonthIndex, { ...ctx, year: targetYear }, scope);
            });
        }

        // --- MINI CALENDAR CURRENT MONTH (Daily / Weekly Scope) ---
        if (ph.type === 'MINI_CALENDAR_CURRENT_MONTH' && (scope === 'daily' || scope === 'weekly')) {
            const blueprint = ctx.placeholders.mini || [];
            if (blueprint.length === 0) return;

            let targetMonthIndex = 0;
            let targetYear = year;
            let highlightDate: Date | undefined = undefined;

            if (scope === 'daily') {
                // Calculate Current Month from Daily Index
                const date = new Date(year, 0, 1);
                date.setDate(date.getDate() + index);

                targetMonthIndex = date.getMonth();
                targetYear = date.getFullYear();
                highlightDate = date; // Pass for day circle
            } else {
                // Weekly Scope
                // Calculate Month from Week Index
                // Use UTC logic to match getWeekNumber expectation (Sunday Start / Mon Start logic is built around getUTCDay in getWeekNumber for reliable year shifts)
                // Wait, renderPlaceholders loop 'i' (index) corresponds to 0-based week index of the year.
                // We need to find the Start Date (Sun/Mon) of that week.

                const jan1 = new Date(year, 0, 1);
                const jan1Day = jan1.getDay(); // 0-6

                // Use planner's "Week containing Jan 1" method (NOT ISO week)
                let firstWeekStart;
                if (startDay === 'Monday') {
                    // Find Monday of week containing Jan 1
                    const targetDay = 1;
                    const diff = (jan1Day - targetDay + 7) % 7;
                    firstWeekStart = new Date(year, 0, 1 - diff);
                } else {
                    // Sunday Start (US)
                    // Week 1 contains Jan 1.
                    // Start is the Sunday of that week.
                    const diffToSun = jan1Day; // Sun(0)->0, Mon(1)->1...
                    firstWeekStart = new Date(year, 0, 1 - diffToSun);
                }

                const weekDate = new Date(firstWeekStart);
                // Add index*7 days using local methods
                weekDate.setDate(weekDate.getDate() + (index * 7));

                // weekDate is now the Start Date (local) of the week.

                // Use Middle of week to decide "Current Month" (so Week spanning Jan/Feb belongs to major month)
                const middleDate = new Date(weekDate);
                middleDate.setDate(middleDate.getDate() + 3);

                targetMonthIndex = middleDate.getMonth();
                targetYear = middleDate.getFullYear();

                // weekDate is already local, use it directly for highlight
                highlightDate = weekDate;
            }

            blueprint.forEach((item: PlaceholderConfig) => {
                const shiftedPh = { ...item, x: ph.x + item.x, y: ph.y + item.y };
                renderMiniItem(page, shiftedPh, targetMonthIndex, { ...ctx, year: targetYear }, scope, 0, 0, highlightDate);
            });
        }


        if (ph.type === 'CUSTOM_TEXT') {
            let fontToUse = regularFont;
            if (ph.style?.font?.includes('Bold')) fontToUse = boldFont;
            else if (ph.style?.font?.includes('Light')) fontToUse = lightFont;
            else if (ph.style?.font?.includes('Thin')) fontToUse = thinFont;
            let text = ph.label;

            // TOKEN REPLACEMENT
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

            // Year
            text = text.replace(/%year%|%year_number%/g, year.toString());

            // Contextual replacements based on scope
            if (scope === 'monthly') {
                const mIndex = index; // 0-11
                text = text.replace(/%month%|%month_number%/g, (mIndex + 1).toString());
                text = text.replace(/%month%|%month_number%/g, (mIndex + 1).toString());
                text = text.replace(/%month_name%/g, months[mIndex]);
                text = text.replace(/%month_short%/g, months[mIndex].substring(0, 3));
            } else if (scope === 'weekly') {
                // Weekly scope index is 0-based week index (0-52)
                const weekNum = index + 1;
                text = text.replace(/%week%|%week_number%/g, weekNum.toString());

                // Calculate approx start date of week to give proper month
                // Assumes simple logic: Jan 1 is in Week 1. 
                // A better approach would be proper ISO week logic but for this custom planner 
                // we'll estimate based on "Start Day" (Monday) + 7 * index


                // Find first Monday (or Start Day) of Year
                // Calculate start date of week
                // Logic: Find the "Start Day" (Monday or Sunday) of the week that contains Jan 1.
                const jan1 = new Date(year, 0, 1);
                const currentDay = jan1.getDay(); // 0=Sun, 1=Mon...
                const targetDay = startDay === 'Monday' ? 1 : 0;
                let diff = (currentDay - targetDay + 7) % 7;

                // If Jan 1 is Sunday (0) and start is Monday (1), diff is 6. This means the week starts 6 days prior (prev Monday).
                // If Jan 1 is Wednesday (3) and start is Monday (1), diff is 2. Week starts Dec 30.

                const firstWeekStart = new Date(year, 0, 1 - diff);
                const weekDate = new Date(firstWeekStart);
                weekDate.setDate(firstWeekStart.getDate() + (index * 7));

                // Middle of week for Month name
                const middleDate = new Date(weekDate);
                middleDate.setDate(middleDate.getDate() + 3);

                let targetTitleMonth = middleDate.getMonth();
                const middleYear = middleDate.getFullYear();

                if (middleYear < year) targetTitleMonth = 0; // Force Jan
                else if (middleYear > year) targetTitleMonth = 11; // Force Dec

                // Force Month Label for Extended Pages (Overrides above)
                if (ctx.isNextJan) targetTitleMonth = 0;
                if (ctx.isPrevDec) targetTitleMonth = 11;

                text = text.replace(/%month%|%month_number%/g, (targetTitleMonth + 1).toString());
                text = text.replace(/%month_name%/g, months[targetTitleMonth]);
                text = text.replace(/%month_short%/g, months[targetTitleMonth].substring(0, 3));
                text = text.replace(/%day%|%day_number%/g, weekDate.getDate().toString()); // Start of week day
                text = text.replace(/%day_name%/g, days[weekDate.getDay()]);

            } else if (scope === 'daily') {
                const date = new Date(year, 0, 1);
                date.setDate(date.getDate() + index);

                text = text.replace(/%month%|%month_number%/g, (date.getMonth() + 1).toString());
                // Short month name for daily? Or full? Let's use full
                text = text.replace(/%month_name%/g, months[date.getMonth()]);
                text = text.replace(/%month_short%/g, months[date.getMonth()].substring(0, 3));
                text = text.replace(/%day%|%day_number%/g, date.getDate().toString());
                text = text.replace(/%day_name%/g, days[date.getDay()]);
                text = text.replace(/%day_name%/g, days[date.getDay()]);
                text = text.replace(/%week%|%week_number%/g, getWeekNumber(date, startDay).toString());
            }

            // Week Headers
            if (text.includes('%week_header_full%')) {
                const dayNames = startDay === 'Monday'
                    ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                text = text.replace(/%week_header_full%/g, dayNames.join(' ')); // Separated by space (kerning will handle)
            }
            if (text.includes('%week_header_short%')) {
                const dayNamesShort = startDay === 'Monday'
                    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                text = text.replace(/%week_header_short%/g, dayNamesShort.join(' '));
            }

            if (ph.style?.textTransform === 'uppercase') {
                text = text.toUpperCase();
            }

            // Render
            if (ph.grid) {
                // GRID MODE
                // Split text by spaces and distribute
                const tokens = text.trim().split(/\s+/);
                const grid = ph.grid;
                const count = Math.min(tokens.length, grid.cols * grid.rows);

                // Determine Sunday index for week headers
                const isWeekHeader = ph.label.includes('%week_header_full%') || ph.label.includes('%week_header_short%');
                const sundayIndex = startDay === 'Monday' ? 6 : 0;

                for (let i = 0; i < count; i++) {
                    const token = tokens[i];
                    const r = Math.floor(i / grid.cols);
                    const c = i % grid.cols;

                    const cellX = pdfX + (c * (grid.width + grid.paddingX));
                    const cellY = pdfY - (r * (grid.height + grid.paddingY));

                    // Use medium font for Sunday in week headers
                    const tokenFont = (isWeekHeader && i === sundayIndex) ? mediumFont : fontToUse;

                    // Draw Token Centered in Cell
                    let drawX = cellX;
                    // Default to center align for grid cells usually
                    // Or follow ph.style.align logic relative to cell width

                    // Simple center alignment in cell
                    const textWidth = tokenFont.widthOfTextAtSize(token, fontSize) + ((token.length - 1) * letterSpacing);
                    drawX = cellX + (grid.width - textWidth) / 2;
                    // Y center
                    const drawY = cellY - (grid.height / 2) - (fontSize / 3); // Approx vertical center

                    drawTextWithKerning(page, token, { x: drawX, y: drawY, size: fontSize, font: tokenFont, color, letterSpacing });
                }

            } else {
                // SINGLE LINE MODE
                let drawX = pdfX;
                if (align === 'center') {
                    const textWidth = fontToUse.widthOfTextAtSize(text, fontSize) + (text.length > 1 ? (text.length - 1) * letterSpacing : 0);
                    drawX -= (textWidth / 2);
                } else if (align === 'right') {
                    const textWidth = fontToUse.widthOfTextAtSize(text, fontSize) + (text.length > 1 ? (text.length - 1) * letterSpacing : 0);
                    drawX -= textWidth;
                }

                drawTextWithKerning(page, text, { x: drawX, y: pdfY, size: fontSize, font: fontToUse, color, letterSpacing });

                // LINK LOGIC FOR DAILY PAGE -> WEEKLY PAGE
                if (scope === 'daily' && (ph.label.includes('%week%') || ph.label.includes('%week_number%'))) {
                    // Calculate Text Width to define link rect
                    const finalWidth = fontToUse.widthOfTextAtSize(text, fontSize) + (text.length > 1 ? (text.length - 1) * letterSpacing : 0);
                    // drawX is the left edge

                    // Re-calculate or reuse
                    const weekNum = getWeekNumber(new Date(year, 0, 1 + index), startDay);

                    let targetT = 'WEEK';
                    let targetI = weekNum - 1;

                    if (ctx.isPrevDec) {
                        targetT = 'PREV_DEC_WEEK';
                        // Need start week of Prev Dec (Dec 1)
                        const dec1 = new Date(year, 11, 1);
                        const startW = getWeekNumber(dec1, startDay);
                        targetI = weekNum - startW;
                    } else if (ctx.isNextJan) {
                        targetT = 'NEXT_JAN_WEEK';
                        const jan1 = new Date(year, 0, 1);
                        const startW = getWeekNumber(jan1, startDay);
                        targetI = weekNum - startW;
                    }

                    if (targetI >= 0) {
                        ctx.links.push({
                            pageIndex: ctx.doc.getPageCount() - 1,
                            rect: [drawX, pdfY, drawX + finalWidth, pdfY + fontSize],
                            targetType: targetT,
                            targetId: targetI
                        });
                    }
                }
            }
        }

        // --- CUSTOM GRID ---
        if (ph.type === 'CUSTOM_GRID') {
            const grid = ph.grid || { cols: 4, rows: 4, width: 30, height: 20, paddingX: 0, paddingY: 0 };
            const count = grid.cols * grid.rows;

            for (let i = 0; i < count; i++) {
                const r = Math.floor(i / grid.cols);
                const c = i % grid.cols;

                const cellX = pdfX + (c * (grid.width + grid.paddingX));
                const cellY = pdfY - (r * (grid.height + grid.paddingY));

                page.drawRectangle({
                    x: cellX,
                    y: cellY - grid.height,
                    width: grid.width,
                    height: grid.height,
                    borderColor: color,
                    borderWidth: 0.5,
                });
            }
        }

        // --- MONTHLY GRID (DATE_MAIN) ---
        if (ph.type === 'DATE_MAIN' && scope === 'monthly') {
            const grid = ph.grid || { width: 20, height: 20, paddingX: 2, paddingY: 2, cols: 7, rows: 6 };
            const month = index;
            const gridStartDate = new Date(year, month, 1);
            const startDayOfWeek = gridStartDate.getDay(); // 0Sun - 6Sat
            // Shift: how many empty cells before the 1st
            const shift = startDay === 'Monday'
                ? (startDayOfWeek === 0 ? 6 : startDayOfWeek - 1)
                : startDayOfWeek; // Sunday start: 0->0, 1->1...

            // Go back to start of grid (previous month days)
            gridStartDate.setDate(gridStartDate.getDate() - shift);

            for (let i = 0; i < Math.min(grid.rows * grid.cols, 37); i++) {
                const cellDate = new Date(gridStartDate);
                cellDate.setDate(cellDate.getDate() + i);

                const row = Math.floor(i / grid.cols);
                const col = i % grid.cols;

                const cellX = pdfX + (col * (grid.width + grid.paddingX));
                const cellY = pdfY - (row * (grid.height + grid.paddingY));

                const dateStr = cellDate.getDate().toString();

                // Check if this date is a holiday
                const holidaySettings = ctx.holidaySettings;
                let holiday: Holiday | null = null;
                if (holidaySettings?.countryCode) {
                    holiday = isHoliday(cellDate, holidaySettings.countryCode, {
                        showPublic: holidaySettings.showPublic !== false,
                        showBank: holidaySettings.showBank !== false,
                        showObservance: holidaySettings.showObservance === true
                    });
                }

                // Dim color for other months, red for holidays
                let cellColor = cellDate.getMonth() === month ? color : rgb(0.6, 0.6, 0.6);
                if (holiday && cellDate.getMonth() === month) {
                    cellColor = rgb(0.8, 0.1, 0.1); // Red for holidays
                }

                // Right align date in cell
                const textWidth = regularFont.widthOfTextAtSize(dateStr, fontSize) + (dateStr.length - 1) * letterSpacing;
                const textX = cellX + grid.width - textWidth - 2; // Right align with 2px padding

                // Draw holiday dot indicator next to the date number
                if (holiday && cellDate.getMonth() === month) {
                    const displayStyle = holidaySettings?.displayStyle || 'all';
                    if (displayStyle === 'dot' || displayStyle === 'all' || displayStyle === 'highlight') {
                        // Draw small red dot indicator to the LEFT of the date text
                        page.drawCircle({
                            x: textX - 5, // 5px to the left of date text
                            y: cellY - (grid.height / 2) + (fontSize / 3), // Aligned with text baseline
                            size: 2,
                            color: rgb(0.8, 0.1, 0.1)
                        });
                    }
                }

                // Use medium font for Sundays (to make them stand out)
                const dateFontToUse = cellDate.getDay() === 0 ? mediumFont : fontToUse;
                drawTextWithKerning(page, dateStr, { x: textX, y: cellY - (grid.height / 2), size: fontSize, font: dateFontToUse, color: cellColor, letterSpacing });

                // Link to Daily Page
                if (!ctx.skipDailyLinks) {
                    // Check if date belongs to Main Year, Prev Dec, or Next Jan
                    const dYear = cellDate.getFullYear();
                    const dMonth = cellDate.getMonth();
                    const plannerYear = ctx.plannerYear;

                    let tType = 'DAY'; // Default Main Year
                    let tId = -1;

                    if (dYear === plannerYear) {
                        // Main Year
                        tId = getDayOfYear(cellDate);
                        // Validation: If date is Jan of Next Year (but year matches?), no year is planner year.
                        // Ensure we don't link Jan 1 of next year if it shows up in Dec grid of main year?
                        // Actually, if year == context.year, it's fine.
                    } else if (dYear === plannerYear - 1 && dMonth === 11) {
                        // Prev Dec
                        // We need index 0..30 (Dec 1 .. Dec 31)
                        tType = 'PREV_DEC_DAY';
                        tId = cellDate.getDate() - 1;
                    } else if (dYear === plannerYear + 1 && dMonth === 0) {
                        // Next Jan
                        tType = 'NEXT_JAN_DAY';
                        tId = cellDate.getDate() - 1;
                    }

                    if (tId >= 0) {
                        ctx.links.push({
                            pageIndex: ctx.doc.getPageCount() - 1,
                            rect: [cellX, cellY - 30 - 60, cellX + grid.width, cellY - 60],
                            targetType: tType,
                            targetId: tId
                        });
                    }
                }
            }
        }

        // --- WEEKLY DATES (WEEK_DATE) ---
        if (ph.type === 'WEEK_DATE' && scope === 'weekly') {
            const grid = ph.grid || { width: 30, height: 20, paddingX: 5, paddingY: 0, cols: 7, rows: 1 };

            // Calculate week start
            // Logic: Find the "Start Day" (Monday or Sunday) of the week that contains Jan 1.
            const jan1 = new Date(year, 0, 1);
            const currentDay = jan1.getDay(); // 0=Sun, 1=Mon...
            const targetDay = startDay === 'Monday' ? 1 : 0;
            let diff = (currentDay - targetDay + 7) % 7;

            const firstWeekStart = new Date(year, 0, 1 - diff);
            // Current week start
            const currentWeekStart = new Date(firstWeekStart);
            currentWeekStart.setDate(currentWeekStart.getDate() + (index * 7));

            for (let i = 0; i < grid.cols; i++) {
                const cellDate = new Date(currentWeekStart);
                cellDate.setDate(cellDate.getDate() + i);

                const cellX = pdfX + (i * (grid.width + grid.paddingX));
                const cellY = pdfY; // row 0

                const dateText = cellDate.getDate().toString();
                const textWidth = fontToUse.widthOfTextAtSize(dateText, fontSize);
                const textX = cellX + (grid.width - textWidth) / 2;

                // Check for holiday - use red color
                let dateColor = color;
                let holidayForLabel: Holiday | null = null;
                const holidaySettings = ctx.holidaySettings;
                if (holidaySettings?.countryCode) {
                    const holiday = isHoliday(cellDate, holidaySettings.countryCode, {
                        showPublic: holidaySettings.showPublic !== false,
                        showBank: holidaySettings.showBank !== false,
                        showObservance: holidaySettings.showObservance === true
                    });
                    if (holiday) {
                        dateColor = rgb(0.8, 0.1, 0.1); // Red for holidays
                        holidayForLabel = holiday;
                    }
                }

                // Use medium font for Sundays (to make them stand out)
                const dateFontToUse = cellDate.getDay() === 0 ? mediumFont : fontToUse;

                drawTextWithKerning(page, dateText, {
                    x: textX,
                    y: cellY - 10,
                    size: fontSize,
                    font: dateFontToUse,
                    color: dateColor,
                    letterSpacing
                });

                // Draw holiday label below date if holidayOffsetY is set
                if (holidayForLabel && grid.holidayOffsetY) {
                    // Use centralized holiday display name shortening
                    let holidayName = getHolidayDisplayName(holidayForLabel.name).toUpperCase();

                    // Select CJK font
                    let holidayFont = boldFont;
                    let isCJK = false;
                    const countryCode = holidaySettings?.countryCode?.toUpperCase();
                    if (countryCode === 'JP') {
                        holidayFont = ctx.notoSansJP || boldFont; isCJK = true;
                    } else if (countryCode === 'KR') {
                        holidayFont = ctx.notoSansKR || boldFont; isCJK = true;
                    } else if (countryCode === 'CN') {
                        holidayFont = ctx.notoSansSC || boldFont; isCJK = true;
                    } else if (countryCode === 'TW' || countryCode === 'HK') {
                        holidayFont = ctx.notoSansTC || boldFont; isCJK = true;
                    }

                    const pillFontSize = grid.holidayFontSize || 7;
                    const pillTextWidth = holidayFont.widthOfTextAtSize(holidayName, pillFontSize);
                    const pillPadding = 8; // Side padding for wider pill
                    const pillH = pillFontSize + 6; // Scale pill height with font size
                    const pillW = pillTextWidth + (pillPadding * 2);
                    const pillRadius = pillH / 2;

                    // Position below date at the configured offset (left-aligned for consistency)
                    const xOffset = grid.holidayOffsetX || 0;
                    const pillX = cellX + xOffset; // Left-aligned, use offset to fine-tune
                    const pillY = cellY - 10 - grid.holidayOffsetY - pillH;

                    const fillColor = rgb(0.8, 0.15, 0.15);

                    // Draw pill
                    const leftCX = pillX + pillRadius;
                    const leftCY = pillY + pillRadius;
                    const rightCX = pillX + pillW - pillRadius;

                    page.drawCircle({ x: leftCX, y: leftCY, size: pillRadius, color: fillColor });
                    page.drawCircle({ x: rightCX, y: leftCY, size: pillRadius, color: fillColor });
                    page.drawRectangle({ x: leftCX, y: pillY, width: rightCX - leftCX, height: pillH, color: fillColor });

                    // Draw text
                    const textXOffset = isCJK ? -1 : -2;
                    const labelX = pillX + (pillW - pillTextWidth) / 2 + textXOffset;
                    const labelY = pillY + (pillH / 2) - (pillFontSize * 0.35);

                    drawTextWithKerning(page, holidayName, {
                        x: labelX, y: labelY, size: pillFontSize, font: holidayFont, color: rgb(1, 1, 1), letterSpacing: 0.2
                    });
                }

                // Link to Day
                // Check year
                const dYear = cellDate.getFullYear();
                const dMonth = cellDate.getMonth();
                const plannerYear = ctx.plannerYear;

                let tType = 'DAY';
                let tId = -1;

                if (dYear === plannerYear) {
                    tId = getDayOfYear(cellDate);
                } else if (dYear === plannerYear - 1 && dMonth === 11) {
                    tType = 'PREV_DEC_DAY';
                    tId = cellDate.getDate() - 1;
                } else if (dYear === plannerYear + 1 && dMonth === 0) {
                    tType = 'NEXT_JAN_DAY';
                    tId = cellDate.getDate() - 1;
                }

                if (tId >= 0) {
                    const linkPadding = 5;
                    ctx.links.push({
                        pageIndex: ctx.doc.getPageCount() - 1,
                        rect: [
                            textX - linkPadding,
                            (cellY - 10) - 2,
                            textX + textWidth + linkPadding,
                            (cellY - 10) + fontSize + 5
                        ],
                        targetType: tType,
                        targetId: tId
                    });
                }
            }
        }

        // --- WEEK_HOLIDAY: Holiday labels for each day of the week ---
        if (ph.type === 'WEEK_HOLIDAY' && scope === 'weekly') {
            const grid = ph.grid || { width: 50, height: 20, paddingX: 5, paddingY: 0, cols: 7, rows: 1 };
            const holidaySettings = ctx.holidaySettings;

            if (holidaySettings?.countryCode) {
                // Calculate week start
                const jan1 = new Date(year, 0, 1);
                const currentDay = jan1.getDay();
                const targetDay = startDay === 'Monday' ? 1 : 0;
                let diff = (currentDay - targetDay + 7) % 7;
                const firstWeekStart = new Date(year, 0, 1 - diff);
                const currentWeekStart = new Date(firstWeekStart);
                currentWeekStart.setDate(currentWeekStart.getDate() + (index * 7));

                for (let i = 0; i < grid.cols; i++) {
                    const cellDate = new Date(currentWeekStart);
                    cellDate.setDate(cellDate.getDate() + i);

                    const holiday = isHoliday(cellDate, holidaySettings.countryCode, {
                        showPublic: holidaySettings.showPublic !== false,
                        showBank: holidaySettings.showBank !== false,
                        showObservance: holidaySettings.showObservance === true
                    });

                    if (holiday) {
                        // Select appropriate CJK font based on country code
                        let holidayFont = boldFont;
                        let isCJK = false;
                        const countryCode = holidaySettings.countryCode.toUpperCase();
                        if (countryCode === 'JP') {
                            holidayFont = ctx.notoSansJP || boldFont;
                            isCJK = true;
                        } else if (countryCode === 'KR') {
                            holidayFont = ctx.notoSansKR || boldFont;
                            isCJK = true;
                        } else if (countryCode === 'CN') {
                            holidayFont = ctx.notoSansSC || boldFont;
                            isCJK = true;
                        } else if (countryCode === 'TW' || countryCode === 'HK') {
                            holidayFont = ctx.notoSansTC || boldFont;
                            isCJK = true;
                        }

                        const holidayName = getHolidayDisplayName(holiday.name).toUpperCase();
                        const cellX = pdfX + (i * (grid.width + grid.paddingX));
                        const cellY = pdfY - grid.height;
                        const pillH = grid.height;
                        const holidayFontSize = fontSize || 8;

                        // Calculate pill width
                        const textWidth = holidayFont.widthOfTextAtSize(holidayName, holidayFontSize);
                        const pillPadding = 8;
                        const pillW = Math.min(textWidth + (pillPadding * 2), grid.width);
                        const pillRadius = pillH / 2;

                        // Center pill in cell
                        const pillX = cellX + (grid.width - pillW) / 2;

                        const fillColor = rgb(0.8, 0.15, 0.15); // Red

                        // Draw pill background
                        const leftCenterX = pillX + pillRadius;
                        const leftCenterY = cellY + pillRadius;
                        const rightCenterX = pillX + pillW - pillRadius;
                        const rightCenterY = cellY + pillRadius;

                        page.drawCircle({ x: leftCenterX, y: leftCenterY, size: pillRadius, color: fillColor });
                        page.drawCircle({ x: rightCenterX, y: rightCenterY, size: pillRadius, color: fillColor });
                        page.drawRectangle({
                            x: leftCenterX, y: cellY, width: rightCenterX - leftCenterX, height: pillH, color: fillColor
                        });

                        // Draw text
                        const textXOffset = isCJK ? -1 : -3;
                        const textX = pillX + (pillW - textWidth) / 2 + textXOffset;
                        const textY = cellY + (pillH / 2) - (holidayFontSize * 0.35);

                        drawTextWithKerning(page, holidayName, {
                            x: textX, y: textY, size: holidayFontSize, font: holidayFont, color: rgb(1, 1, 1), letterSpacing: 0.3
                        });
                    }
                }
            }
        }

        // --- YEARLY MINI GRID ---
        if (ph.type === 'YEARLY_MONTH_GRID') {
            const grid = ph.grid || { cols: 7, rows: 6, width: 10, height: 10, paddingX: 1, paddingY: 1 };
            // We need to know WHICH month to draw.
            // Placeholder logic: We might iterate 12 months for the yearly page?
            // BUT here we are in renderPlaceholders which iterates *placeholders*.
            // So the placeholder itself should define which month it is, OR we assume the user put 12 placeholders?
            // A better way for "Yearly":
            // The user config has 1 placeholder of type "YEARLY_MONTHS_Grid_Group"?? No.
            // Let's stick to simple: The user sets up 12 placeholders in the config, each with a "monthOffset" or we just infer from order?
            // Actually, usually in the builder we drage *one* element "Year Grid" and it generates 12.
            // But if we want full customizability, maybe 12 specific boxes?
            // To simplify for now: We'll assume the placeholder has a `data` index or we use a convention.
            // Hack: Use `align` or `label` to store index? No.
            // Let's use the loop index approach if we had a generator.
            // But we don't.
            // Alternative: The type is 'YEARLY_MONTH_GRID_JAN', 'YEARLY_MONTH_GRID_FEB'... ? Too verbose.
            // Let's assume the label contains information: "Month 1", "Month 2".
            // OR: We check if `ph.label` is "1".."12".

            let targetMonth = -1;
            const parsed = parseInt(ph.label);
            if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
                targetMonth = parsed - 1;
            }

            // Apply Month Offset for Multi-Page Overview (e.g. Page 2 is +6 months)
            if (targetMonth >= 0 && ctx.monthOffset) {
                targetMonth += ctx.monthOffset;
            }

            if (targetMonth >= 0) {
                // Draw the mini calendar for targetMonth
                const m = targetMonth;
                const gridStartDate = new Date(year, m, 1);
                const startDayOfWeek = gridStartDate.getDay();
                // Standard shift
                const shift = startDay === 'Monday'
                    ? (startDayOfWeek === 0 ? 6 : startDayOfWeek - 1)
                    : startDayOfWeek;

                gridStartDate.setDate(gridStartDate.getDate() - shift);

                // Draw Title (Month Name) - Optionally above grid? 
                // Let's assume the grid is JUST the numbers. Title is separate placeholder?
                // Or we draw it if requested. Let's just draw numbers.

                // Draw cells
                for (let i = 0; i < 42; i++) {
                    const cellDate = new Date(gridStartDate);
                    cellDate.setDate(cellDate.getDate() + i);

                    const r = Math.floor(i / 7);
                    const c = i % 7;

                    const cellX = pdfX + (c * (grid.width + grid.paddingX));
                    const cellY = pdfY - (r * (grid.height + grid.paddingY));

                    // Only draw if same month
                    if (cellDate.getMonth() === m) {
                        const dateStr = cellDate.getDate().toString();

                        // Check for holiday
                        let dateColor = color;
                        const holidaySettings = ctx.holidaySettings;
                        if (holidaySettings?.countryCode) {
                            const holiday = isHoliday(cellDate, holidaySettings.countryCode, {
                                showPublic: holidaySettings.showPublic !== false,
                                showBank: holidaySettings.showBank !== false,
                                showObservance: holidaySettings.showObservance === true
                            });
                            if (holiday) {
                                dateColor = rgb(0.8, 0.1, 0.1); // Red for holidays
                            }
                        }

                        drawTextWithKerning(page, dateStr, {
                            x: cellX + (grid.width / 2) - 2, // rough center
                            y: cellY - (grid.height / 2) - 2,
                            size: fontSize,
                            font: fontToUse,
                            color: dateColor,
                            letterSpacing
                        });

                        // Link to Daily Page
                        const dayOfYear = getDayOfYear(cellDate);
                        if (dayOfYear >= 0) {
                            ctx.links.push({
                                pageIndex: ctx.doc.getPageCount() - 1,
                                rect: [cellX, cellY - grid.height, cellX + grid.width, cellY],
                                targetType: 'DAY',
                                targetId: dayOfYear
                            });
                        }
                    }
                }
            }
        }

        // --- LINK RECT (INVISIBLE LINK) ---
        if (ph.type === 'LINK_RECT') {
            const rectX = pdfX;
            // pdfY is bottom-up (height - y).
            // User drawing usually assumes top-down. 
            // Correct mapping: rectY (bottom) = pdfY (top) - height. 
            // Wait, pdfY = height - y - fontSize.
            // For Rect: y is top-left.
            // pdfY logic in this function: const pdfY = height - y - (fontSize * 0.8);
            // This logic is tuned for Text baseline.
            // For generic rect, let's just use height - y.
            const rectTopY = height - y;
            const w = ph.grid?.width || 50;
            const h = ph.grid?.height || 20;
            const rectBottomY = rectTopY - h;

            // Debug: Border
            // page.drawRectangle({ x: rectX, y: rectBottomY, width: w, height: h, borderWidth: 1, borderColor: rgb(1,0,0) });

            let targetType = 'URL';
            // Determine target
            const labelLower = ph.label.toLowerCase();

            if (labelLower === 'yearly') targetType = 'YEAR';
            else if (labelLower === 'overview') targetType = 'OVERVIEW';
            else if (labelLower === 'grid') targetType = 'EXTRA_GRID';
            else if (labelLower === 'dot') targetType = 'EXTRA_DOT';
            else if (labelLower === 'line') targetType = 'EXTRA_LINE';
            else if (labelLower === 'blank') targetType = 'EXTRA_BLANK';
            else if (labelLower === 'prev dec') targetType = 'PREV_DEC';
            else if (labelLower === 'next jan') targetType = 'NEXT_JAN';
            else if (labelLower.startsWith('http')) targetType = 'URL';

            if (targetType === 'URL') {
                let url = ph.label.trim();
                // If no protocol scheme is detected (e.g. http://, mailto:), prepend https://
                if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
                    url = 'https://' + url;
                }
                ctx.links.push({
                    pageIndex: ctx.doc.getPageCount() - 1,
                    rect: [rectX, rectBottomY, rectX + w, rectBottomY + h],
                    targetType: 'URL',
                    url: url
                });
            } else {
                ctx.links.push({
                    pageIndex: ctx.doc.getPageCount() - 1,
                    rect: [rectX, rectBottomY, rectX + w, rectBottomY + h],
                    targetType: targetType,
                    targetId: 0 // Default to first page of extrs
                });
            }
        }
    });
}

function applyHyperlinks(ctx: any) {
    ctx.links.forEach((link: any) => {
        let targetPage = -1;

        if (link.targetType === 'DAY' && ctx.dailyPageIndices.length > link.targetId) {
            targetPage = ctx.dailyPageIndices[link.targetId];
        } else if (link.targetType === 'WEEK' && ctx.weeklyPageIndices.length > link.targetId) {
            targetPage = ctx.weeklyPageIndices[link.targetId];
        } else if (link.targetType === 'MONTH' && ctx.monthlyPageIndices.length > link.targetId) {
            targetPage = ctx.monthlyPageIndices[link.targetId];
        } else if (link.targetType === 'YEAR') {
            // Assuming first page is yearly? Or track it?
            // Current flow: Yearly is first generated. Index 0 usually.
            // But if cover page exists?
            // We removed yearlyPageIndices. But we know it's usually page 0 if scope includes it.
            // Let's assume start of doc.
            targetPage = 0;
        } else if (link.targetType === 'OVERVIEW' && ctx.overviewPageIndices && ctx.overviewPageIndices.length > 0) {
            targetPage = ctx.overviewPageIndices[0]; // Assuming 1 overview page or link to first
        } else if (link.targetType === 'EXTRA_GRID' && ctx.extraPageIndices?.grid?.length > 0) targetPage = ctx.extraPageIndices.grid[0];
        else if (link.targetType === 'EXTRA_DOT' && ctx.extraPageIndices?.dot?.length > 0) targetPage = ctx.extraPageIndices.dot[0];
        else if (link.targetType === 'EXTRA_LINE' && ctx.extraPageIndices?.line?.length > 0) targetPage = ctx.extraPageIndices.line[0];
        else if (link.targetType === 'EXTRA_BLANK' && ctx.extraPageIndices?.blank?.length > 0) targetPage = ctx.extraPageIndices.blank[0];
        else if (link.targetType === 'PREV_DEC' && ctx.prevMonthPageIndex >= 0) targetPage = ctx.prevMonthPageIndex;
        else if (link.targetType === 'NEXT_JAN' && ctx.nextMonthPageIndex >= 0) targetPage = ctx.nextMonthPageIndex;
        else if (link.targetType === 'PREV_DEC_WEEK' && ctx.prevDecWeeklyPageIndices?.length > link.targetId) targetPage = ctx.prevDecWeeklyPageIndices[link.targetId];
        else if (link.targetType === 'NEXT_JAN_WEEK' && ctx.nextJanWeeklyPageIndices?.length > link.targetId) targetPage = ctx.nextJanWeeklyPageIndices[link.targetId];
        else if (link.targetType === 'PREV_DEC_DAY' && ctx.prevDecDailyPageIndices?.length > link.targetId) targetPage = ctx.prevDecDailyPageIndices[link.targetId];
        else if (link.targetType === 'NEXT_JAN_DAY' && ctx.nextJanDailyPageIndices?.length > link.targetId) targetPage = ctx.nextJanDailyPageIndices[link.targetId];

        if (targetPage >= 0) {
            const page = ctx.doc.getPage(link.pageIndex);

            const linkAnnotation = ctx.doc.context.register(
                ctx.doc.context.obj({
                    Type: PDFName.of('Annot'),
                    Subtype: PDFName.of('Link'),
                    Rect: link.rect,
                    Border: [0, 0, 0],
                    Dest: [ctx.doc.getPage(targetPage).ref, 'XYZ', null, null, null],
                })
            );

            let annots = page.node.lookup(PDFName.of('Annots'));
            if (!annots) {
                annots = ctx.doc.context.obj([]);
                page.node.set(PDFName.of('Annots'), annots);
            }
            annots.push(linkAnnotation);
        } else if (link.targetType === 'URL') {
            const page = ctx.doc.getPage(link.pageIndex);
            const linkAnnotation = ctx.doc.context.register(
                ctx.doc.context.obj({
                    Type: PDFName.of('Annot'),
                    Subtype: PDFName.of('Link'),
                    Rect: link.rect,
                    Border: [0, 0, 0],
                    A: ctx.doc.context.obj({
                        Type: PDFName.of('Action'),
                        S: PDFName.of('URI'),
                        URI: PDFString.of(link.url) // Wrap in PDFString to ensure correct encoding (e.g. (https://...))
                    })
                })
            );
            let annots = page.node.lookup(PDFName.of('Annots'));
            if (!annots) {
                annots = ctx.doc.context.obj([]);
                page.node.set(PDFName.of('Annots'), annots);
            }
            annots.push(linkAnnotation);
        }
    });
}

// UTILS

function getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay) - 1;
}

function getWeekNumber(d: Date, startDay: 'Monday' | 'Sunday' = 'Monday'): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = date.getUTCDay(); // 0(Sun) - 6(Sat)

    if (startDay === 'Monday') {
        // User Request: First week of January should always be Week 1.
        // ISO-8601 would say Jan 1 2027 (Fri) is Week 53 of 2026.
        // We want to force it to be Week 1.
        // Logic: Calculate distance from the Monday of the week containing Jan 1.

        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        const yearStartDay = yearStart.getUTCDay(); // 0(Sun)..6(Sat)

        // Find Monday of the week containing Jan 1
        // If Jan 1 is Mon(1), offset is 0.
        // If Jan 1 is Tue(2), offset is -1 day.
        // If Jan 1 is Sun(0), offset is -6 days (prev Mon).
        // Formula: shift = (day == 0 ? 6 : day - 1)
        const jan1Shift = yearStartDay === 0 ? 6 : yearStartDay - 1;
        const jan1WeekStart = new Date(yearStart);
        jan1WeekStart.setUTCDate(jan1WeekStart.getUTCDate() - jan1Shift);

        // Current Date
        // Find Monday of current week
        const currentDayOfWeek = date.getUTCDay(); // 0(Sun)..6(Sat)
        const currentShift = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
        const currentWeekStart = new Date(date);
        currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - currentShift);

        // Diff
        const diff = currentWeekStart.getTime() - jan1WeekStart.getTime();
        const weekNum = Math.floor(diff / 604800000) + 1; // 604800000 = 7 * 24 * 3600 * 1000

        // Handle edge case: If date is in Dec but part of Week 1 of next year?
        // E.g. Dec 29 2026 is in Week 1 of 2027?
        // The input 'd' usually comes from iterating the current year.
        // If d is Dec 2026, getFullYear is 2026.
        // If we want "planner 2027", we usually pass 2027 dates.
        // But if d is Dec 30, it might be Week 1 of NEXT year.
        // However, this function relies on d.getFullYear().
        // If the user asks for Week number of a date, we usually respect the year of that date unless context overrides.
        // For the planner, we generate dates for 2027.
        // So Jan 1 2027 -> Week 1.

        return weekNum;
    } else {
        // Sunday Start (US-style)
        // Week 1 is the week containing Jan 1st.
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        const yearStartDay = yearStart.getUTCDay(); // 0(Sun)..6(Sat)

        // Days since Jan 1
        const diff = date.getTime() - yearStart.getTime();
        const days = Math.floor(diff / 86400000);

        // Offset by the day of week of Jan 1 to align to Sunday weeks
        return Math.floor((days + yearStartDay) / 7) + 1;
    }
}

function drawTextWithKerning(
    page: PDFPage,
    text: string,
    options: {
        x: number;
        y: number;
        size: number;
        font: PDFFont;
        color: any;
        letterSpacing?: number;
        rotate?: any;
    }
) {
    const { x, y, size, font, color, letterSpacing = 0, rotate } = options;

    // If rotation is present, fallback to standard drawText (with any-cast for characterSpacing if needed)
    // because manual positioning for rotated text is complex/error-prone without vector math.
    if (rotate) {
        page.drawText(text, {
            x, y, size, font, color, rotate,
            characterSpacing: letterSpacing
        } as any);
        return;
    }

    if (letterSpacing === 0) {
        page.drawText(text, { x, y, size, font, color });
    } else {
        let currentX = x;
        const characters = text.split('');
        for (const char of characters) {
            page.drawText(char, { x: currentX, y, size, font, color });
            currentX += font.widthOfTextAtSize(char, size) + letterSpacing;
        }
    }
}

// Helper for Mini Calendar Items
function renderMiniItem(
    page: PDFPage,
    ph: PlaceholderConfig,
    monthIndex: number, // 0-11
    ctx: any,
    scope: string, // context scope
    baseX: number = 0,
    baseY: number = 0,
    highlightDate?: Date
) {
    const { year, startDay, font: regularFont, boldFont, lightFont, thinFont } = ctx;
    const height = page.getHeight();
    const x = baseX + ph.x; // Relative to instance position
    const y = baseY + ph.y;
    const fontSize = ph.style?.fontSize || 8;

    // Position calculation (same as main renderer)
    const pdfY = height - y - (fontSize * 0.8);
    const pdfX = x;

    const fontToUse = ph.style?.font === 'Roboto-Bold' ? boldFont : (ph.style?.font === 'Roboto-Light' ? lightFont : (ph.style?.font === 'Roboto-Thin' ? thinFont : regularFont));
    const letterSpacing = ph.style?.letterSpacing || 0;
    const color = rgb(0, 0, 0);



    // MINI TITLE (Month Name / Year)
    if (ph.type === 'MINI_CAL_TITLE') {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        let text = ph.label;

        // FILTER: Remove %month_short% element on daily pages AND weekly pages (as requested)
        if ((scope === 'daily' || scope === 'weekly') && (text.includes('%month_short%') || text.trim() === 'Month Title')) {
            // Basic check: if the label is primarily just the short month token, hide it.
            // Or if it contains it, user said "remove the element".
            // We'll return early to skip rendering this element completely.
            if (text.trim() === '%month_short%' || text.includes('%month_short%')) {
                return;
            }
        }

        // Tokens
        text = text.replace(/%year%/g, year.toString());
        text = text.replace(/%month_name%/g, months[monthIndex]);
        text = text.replace(/%month_short%/g, months[monthIndex].substring(0, 3));
        text = text.replace(/%month_number%/g, (monthIndex + 1).toString());
        // Add header variations if user wants to use those specifically
        text = text.replace(/%header_month_name%/g, months[monthIndex]);
        text = text.replace(/%header_month_number%/g, (monthIndex + 1).toString());

        if (ph.style?.textTransform === 'uppercase') text = text.toUpperCase();

        let drawX = pdfX;
        if (ph.style?.align === 'center') {
            const textWidth = fontToUse.widthOfTextAtSize(text, fontSize) + (text.length - 1) * letterSpacing;
            drawX -= (textWidth / 2);
        } else if (ph.style?.align === 'right') {
            const textWidth = fontToUse.widthOfTextAtSize(text, fontSize) + (text.length - 1) * letterSpacing;
            drawX -= textWidth;
        }

        drawTextWithKerning(page, text, { x: drawX, y: pdfY, size: fontSize, font: fontToUse, color, letterSpacing });
    }

    // MINI HEADER (M T W...)
    if (ph.type === 'MINI_CAL_HEADER') {
        // Assume Grid Layout
        const cols = ph.grid?.cols || 7;
        const w = ph.grid?.width || 10;
        const gapX = ph.grid?.paddingX || 0;

        // Labels based on Start Day. User requested M T W T F S **S** (Mon start)
        const labels = startDay === 'Monday'
            ? ['M', 'T', 'W', 'T', 'F', 'S', 'S']
            : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

        for (let i = 0; i < 7; i++) {
            const label = labels[i];
            const cellX = pdfX + (i * (w + gapX));

            // Check for Bold Sunday
            // If Monday start: Sunday is index 6.
            // If Sunday start: Sunday is index 0.
            const isSunday = (startDay === 'Monday' && i === 6) || (startDay === 'Sunday' && i === 0);

            // User specifically asked for "Sunday column should be in bold"
            // And image shows "S" at the end (Monday start).
            // We'll follow logic: If isSunday, use Bold Font.

            const headerFont = isSunday ? boldFont : fontToUse;

            // Draw Center
            const textWidth = headerFont.widthOfTextAtSize(label, fontSize);
            const drawX = cellX + (w - textWidth) / 2;

            drawTextWithKerning(page, label, {
                x: drawX,
                y: pdfY,
                size: fontSize,
                font: headerFont,
                color,
                letterSpacing
            });
        }
    }

    // MINI GRID (Dates)
    if (ph.type === 'MINI_CAL_GRID') {
        const start = new Date(year, monthIndex, 1);
        const end = new Date(year, monthIndex + 1, 0); // Last day of month
        const daysInMonth = end.getDate();

        // Determine start column (0-6)
        // Mon start: Mon=0 .. Sun=6
        // Sun start: Sun=0 .. Sat=6
        let startCol = start.getDay(); // Sun=0, Mon=1...
        if (startDay === 'Monday') {
            startCol = (startCol + 6) % 7; // Shift so Mon=0
        }

        const cols = ph.grid?.cols || 7;
        const w = ph.grid?.width || 10;
        const h = ph.grid?.height || 10; // Row height
        const gapX = ph.grid?.paddingX || 0;
        const gapY = ph.grid?.paddingY || 0;

        // Highlight WEEK Logic (Weekly Scope)
        if (scope === 'weekly' && highlightDate) {
            // Refined Logic: Iterate the 7 days of the Highlight Week
            // and determine which rows they fall into in the current month grid.
            // This avoids any 'diff' edge cases.

            const activeRows = new Set<number>();

            for (let i = 0; i < 7; i++) {
                const d = new Date(highlightDate);
                d.setDate(d.getDate() + i); // Shift by i days

                // Check if d is in the target month/year
                // targetYear / monthIndex are the grid's context
                if (d.getFullYear() === year && d.getMonth() === monthIndex) {
                    const dayOfMonth = d.getDate();
                    // Calculate Row
                    const index = startCol + (dayOfMonth - 1);
                    const r = Math.floor(index / 7);
                    activeRows.add(r);
                }
            }

            activeRows.forEach(r => {
                // Draw 156x18 Rounded Rect Centered on Row
                const gridWidth = cols * (w + gapX) - gapX; // Total visual width
                const visualGridWidth = (cols * w) + ((cols - 1) * gapX);

                const centerX = pdfX + (visualGridWidth / 2);
                const rectW = 160; // Updated width per user request
                const rectH = 18; // Height
                const rectX = centerX - (rectW / 2);

                const cellY = pdfY - (r * (h + gapY)); // Top of row
                const rowCenterY = cellY - (h / 2);
                const pillH = 18;
                const pillW = 160;

                // Base Offset: +14 pixels (User requested +6 on top of previous +8)
                const baseOffset = 15;
                const manualOffset = ph.grid?.indicatorY || 0;

                const rectY = rowCenterY - (pillH / 2) + baseOffset + manualOffset;

                // Draw Pill using Polyline Arcs (No full circles)
                // Pill dimensions: 156x18, radius = 9
                const pillRadius = pillH / 2; // 9px radius for rounded ends
                const strokeWidth = 0.5;
                const strokeColor = rgb(0, 0, 0);

                // Left semicircle center
                const leftCenterX = rectX + pillRadius;
                const leftCenterY = rectY + pillRadius;

                // Right semicircle center
                const rightCenterX = rectX + pillW - pillRadius;
                const rightCenterY = rectY + pillRadius;

                // Number of segments for each semicircle (more = smoother)
                const segments = 16;

                // Draw LEFT semicircle (from bottom, around left, to top)
                // Angles: -90° (bottom) to +90° (top), going counterclockwise (through 180°)
                for (let i = 0; i < segments; i++) {
                    const angle1 = (Math.PI / 2) + (i * Math.PI / segments);       // Start angle
                    const angle2 = (Math.PI / 2) + ((i + 1) * Math.PI / segments); // End angle

                    const x1 = leftCenterX + pillRadius * Math.cos(angle1);
                    const y1 = leftCenterY + pillRadius * Math.sin(angle1);
                    const x2 = leftCenterX + pillRadius * Math.cos(angle2);
                    const y2 = leftCenterY + pillRadius * Math.sin(angle2);

                    page.drawLine({
                        start: { x: x1, y: y1 },
                        end: { x: x2, y: y2 },
                        thickness: strokeWidth,
                        color: strokeColor
                    });
                }

                // Draw RIGHT semicircle (from top, around right, to bottom)
                // Angles: +90° (top) to -90° (bottom), going clockwise (through 0°)
                for (let i = 0; i < segments; i++) {
                    const angle1 = (Math.PI / 2) - (i * Math.PI / segments);       // Start angle
                    const angle2 = (Math.PI / 2) - ((i + 1) * Math.PI / segments); // End angle

                    const x1 = rightCenterX + pillRadius * Math.cos(angle1);
                    const y1 = rightCenterY + pillRadius * Math.sin(angle1);
                    const x2 = rightCenterX + pillRadius * Math.cos(angle2);
                    const y2 = rightCenterY + pillRadius * Math.sin(angle2);

                    page.drawLine({
                        start: { x: x1, y: y1 },
                        end: { x: x2, y: y2 },
                        thickness: strokeWidth,
                        color: strokeColor
                    });
                }

                // Draw top line (from left circle top to right circle top)
                page.drawLine({
                    start: { x: leftCenterX, y: rectY + pillH },
                    end: { x: rightCenterX, y: rectY + pillH },
                    thickness: strokeWidth,
                    color: strokeColor
                });

                // Draw bottom line (from left circle bottom to right circle bottom)
                page.drawLine({
                    start: { x: leftCenterX, y: rectY },
                    end: { x: rightCenterX, y: rectY },
                    thickness: strokeWidth,
                    color: strokeColor
                });
            });
        }


        for (let d = 1; d <= daysInMonth; d++) {
            const index = startCol + (d - 1);
            const r = Math.floor(index / 7);
            const c = index % 7;

            const cellX = pdfX + (c * (w + gapX));
            const cellY = pdfY - (r * (h + gapY)); // Downwards

            const dateStr = d.toString();

            // Bold Sunday Check
            const isSunday = (startDay === 'Monday' && c === 6) || (startDay === 'Sunday' && c === 0);
            const dateFont = isSunday ? boldFont : fontToUse;

            // Holiday Check - use red color for holidays
            let dateColor = color;
            let isHolidayDate = false;
            const dDate = new Date(year, monthIndex, d);
            const holidaySettings = ctx.holidaySettings;
            if (holidaySettings?.countryCode) {
                const holiday = isHoliday(dDate, holidaySettings.countryCode, {
                    showPublic: holidaySettings.showPublic !== false,
                    showBank: holidaySettings.showBank !== false,
                    showObservance: holidaySettings.showObservance === true
                });
                if (holiday) {
                    dateColor = rgb(0.8, 0.1, 0.1); // Red for holidays
                    isHolidayDate = true;
                }
            }

            // HIGHLIGHT DAY Logic (Daily Scope)
            if (scope === 'daily' && highlightDate) {
                // Check if this date matches highlightDate
                // Compare Month/Day/Year
                // Check if same day
                // highlightDate has context year set. dDate has year/monthIndex set.
                // Assuming highlightDate matches logical date.
                if (dDate.getFullYear() === highlightDate.getFullYear() &&
                    dDate.getMonth() === highlightDate.getMonth() &&
                    dDate.getDate() === highlightDate.getDate()) {

                    // Draw Circle
                    // Size 18x18. Radius 9.
                    // Center in Cell.
                    // Text is drawn at baseline 'cellY'.
                    // Metric Center of text is approx cellY + (fontSize / 3).
                    const centerX = cellX + (w / 2);
                    const centerY = cellY + (fontSize / 3);

                    // Use red circle for holidays, black for regular days
                    const circleColor = isHolidayDate ? rgb(0.8, 0.1, 0.1) : rgb(0, 0, 0);

                    page.drawCircle({
                        x: centerX,
                        y: centerY,
                        size: 9, // Radius
                        borderColor: circleColor,
                        borderWidth: 0.5,
                        color: undefined,
                        opacity: 1,
                    });
                }
            }

            // Draw Center
            const textWidth = dateFont.widthOfTextAtSize(dateStr, fontSize);
            const drawX = cellX + (w - textWidth) / 2;

            drawTextWithKerning(page, dateStr, {
                x: drawX,
                y: cellY,
                size: fontSize,
                font: dateFont,
                color: dateColor,
                letterSpacing
            });

            // Link to Daily Page
            // FIX: Check isNextYear flag to prevent linking on the generated "future" year page
            // UPDATE: We now support linking to "Next Year Jan" etc.
            // Check context year vs plannerYear
            const dYear = year; // Use context year (might be next year)
            const dMonth = monthIndex;
            const plannerYear = ctx.plannerYear;

            let tType = 'DAY';
            let tId = -1;

            if (dYear === plannerYear) {
                // Main Year
                const currentUTC = Date.UTC(dYear, dMonth, d);
                const jan1UTC = Date.UTC(dYear, 0, 1);
                tId = Math.floor((currentUTC - jan1UTC) / (1000 * 60 * 60 * 24));
            } else if (dYear === plannerYear - 1 && dMonth === 11) {
                // Prev Dec
                tType = 'PREV_DEC_DAY';
                tId = d - 1;
            } else if (dYear === plannerYear + 1 && dMonth === 0) {
                // Next Jan
                tType = 'NEXT_JAN_DAY';
                tId = d - 1;
            }

            if (tId >= 0) {
                ctx.links.push({
                    pageIndex: ctx.doc.getPageCount() - 1,
                    rect: [cellX, cellY, cellX + w, cellY + fontSize],
                    targetType: tType,
                    targetId: tId
                });
            }
        }
    }
}
