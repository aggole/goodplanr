
import { PDFDocument, PDFPage, PDFFont, rgb, StandardFonts, PDFName, PDFRef } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import fontkit from 'fontkit';

interface PlannerOptions {
    year: number;
    startDay: 'Monday' | 'Sunday';
}

interface PageLink {
    pageIndex: number;
    rect: [number, number, number, number]; // llx, lly, urx, ury
    targetPageIndex?: number;
    targetType?: 'DAY' | 'WEEK' | 'MONTH';
    targetId?: number;
}

export async function generatePlannerPdf(options: PlannerOptions): Promise<Uint8Array> {
    const doc = await PDFDocument.create();

    // Register fontkit
    doc.registerFontkit(fontkit);

    // Load Roboto fonts
    const robotoRegularPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf');
    const robotoBoldPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Bold.ttf');

    const robotoRegularBytes = fs.readFileSync(robotoRegularPath);
    const robotoBoldBytes = fs.readFileSync(robotoBoldPath);

    const font = await doc.embedFont(robotoRegularBytes);
    const boldFont = await doc.embedFont(robotoBoldBytes);

    // Page Dimensions (Landscape A4-ish)
    const width = 842;
    const height = 595;

    const context = {
        doc,
        font,
        boldFont,
        width,
        height,
        year: options.year,
        startDay: options.startDay,
        links: [] as PageLink[],
        monthlyPageIndices: [] as number[],
        weeklyPageIndices: [] as number[],
        dailyPageIndices: [] as number[], // Map day of year (0-365/366) to page index
        totalWeeks: 0,
    };

    // Calculate Total Weeks (ISO-8601)
    // The last week of the year is the week number of Dec 28th
    const dec28 = new Date(context.year, 11, 28);
    context.totalWeeks = getWeekNumber(dec28);

    // 1. Generate Pages
    await generateMonthlyPages(context);
    await generateWeeklyPages(context);
    await generateDailyPages(context);

    // 2. Apply Hyperlinks
    applyHyperlinks(context);

    return await doc.save();
}

async function generateMonthlyPages(ctx: any) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    for (let i = 0; i < 12; i++) {
        const page = ctx.doc.addPage([ctx.width, ctx.height]);
        ctx.monthlyPageIndices.push(ctx.doc.getPageCount() - 1);

        drawNavigationTabs(page, ctx, i);

        // Title
        page.drawText(`${months[i]} ${ctx.year}`, {
            x: 30,
            y: ctx.height - 50,
            size: 24,
            font: ctx.boldFont,
        });

        // Grid Layout
        const startX = 30;
        const startY = ctx.height - 80;
        const cellWidth = (ctx.width - 80) / 7;
        const cellHeight = (ctx.height - 100) / 6;

        // Days Header
        const days = ctx.startDay === 'Monday'
            ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        days.forEach((day: string, idx: number) => {
            page.drawText(day, {
                x: startX + (idx * cellWidth) + 10,
                y: startY + 10,
                size: 12,
                font: ctx.font,
            });
        });

        // Calendar Grid
        const firstDayOfMonth = new Date(ctx.year, i, 1);
        let currentDay = new Date(firstDayOfMonth);
        // Adjust to start of week
        const dayOfWeek = currentDay.getDay(); // 0 = Sun, 1 = Mon
        const offset = ctx.startDay === 'Monday'
            ? (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
            : dayOfWeek;

        currentDay.setDate(currentDay.getDate() - offset);

        for (let row = 0; row < 6; row++) {
            // Week Number Link
            const weekNum = getWeekNumber(currentDay);

            // Draw Week Label
            page.drawText(`W${weekNum}`, {
                x: 5,
                y: startY - (row * cellHeight) - 20,
                size: 8,
                font: ctx.font,
                color: rgb(0.5, 0.5, 0.5)
            });

            // Link to Weekly Page
            // Map weekNum (1-based) to index (0-based)
            // If weekNum is 53, it maps to index 52.
            let targetWeekIndex = weekNum - 1;

            // Safety check: ensure we don't link to a non-existent week page
            // Also check for cross-year weeks (e.g. Week 52 in Jan, Week 1 in Dec)
            const isPrevYearWeek = i === 0 && weekNum > 50;
            const isNextYearWeek = i === 11 && weekNum < 5;

            if (targetWeekIndex >= 0 && targetWeekIndex < ctx.totalWeeks && !isPrevYearWeek && !isNextYearWeek) {
                ctx.links.push({
                    pageIndex: ctx.doc.getPageCount() - 1,
                    rect: [0, startY - (row * cellHeight) - cellHeight, 30, startY - (row * cellHeight)],
                    targetType: 'WEEK',
                    targetId: targetWeekIndex
                });
            }

            for (let col = 0; col < 7; col++) {
                const x = startX + (col * cellWidth);
                const y = startY - (row * cellHeight);
                const cellBottomY = y - cellHeight;

                // Draw Cell Box
                page.drawRectangle({
                    x,
                    y: cellBottomY,
                    width: cellWidth,
                    height: cellHeight,
                    borderColor: rgb(0.8, 0.8, 0.8),
                    borderWidth: 1,
                });

                // Draw Date
                const isCurrentMonth = currentDay.getMonth() === i;
                const dateText = currentDay.getDate().toString();

                if (isCurrentMonth) {
                    page.drawText(dateText, {
                        x: x + 5,
                        y: y - 15,
                        size: 10,
                        font: ctx.boldFont,
                    });

                    // Link to Daily Page
                    const dayOfYear = getDayOfYear(currentDay);
                    ctx.links.push({
                        pageIndex: ctx.doc.getPageCount() - 1,
                        rect: [x, cellBottomY, x + cellWidth, y],
                        targetType: 'DAY',
                        targetId: dayOfYear
                    });
                } else {
                    page.drawText(dateText, {
                        x: x + 5,
                        y: y - 15,
                        size: 10,
                        font: ctx.font,
                        color: rgb(0.6, 0.6, 0.6)
                    });
                }

                // Advance Day
                currentDay.setDate(currentDay.getDate() + 1);
            }
        }
    }
}

async function generateWeeklyPages(ctx: any) {
    const colWidth = (ctx.width - 60) / 8;

    // Calculate start of Week 1
    // ISO Week 1 starts on the Monday nearest Jan 4th
    const simpleJan1 = new Date(ctx.year, 0, 1);
    let currentWeekStart = new Date(simpleJan1);

    // Adjust to start of week (Monday)
    // ISO weeks always start on Monday
    const dayOfWeek = currentWeekStart.getDay();
    const offset = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    currentWeekStart.setDate(currentWeekStart.getDate() - offset);

    // If Jan 1 is Fri, Sat, Sun, then Week 1 starts on the next Monday? 
    // No, ISO Week 1 is the first week with a Thursday.
    // Let's use a robust way to find the start of Week 1.
    // Find the Thursday of the week containing Jan 1
    const jan4 = new Date(ctx.year, 0, 4);
    const jan4Day = jan4.getDay();
    const jan4Offset = (jan4Day === 0 ? 6 : jan4Day - 1); // Days from Mon to Jan 4
    const week1Start = new Date(jan4);
    week1Start.setDate(jan4.getDate() - jan4Offset - 3); // Monday of that week
    // Wait, logic check:
    // Jan 4 is always in Week 1.
    // If Jan 4 is Monday, Week 1 starts Jan 4.
    // If Jan 4 is Thursday, Week 1 starts Jan 1.
    // If Jan 4 is Sunday, Week 1 starts Dec 29 prev year.
    // Correct logic: Start of Week 1 is (Jan 4) minus (Jan 4's day of week index [Mon=0...Sun=6]).

    currentWeekStart = new Date(jan4);
    const d = currentWeekStart.getDay();
    const monDiff = d === 0 ? 6 : d - 1;
    currentWeekStart.setDate(currentWeekStart.getDate() - monDiff);


    for (let i = 0; i < ctx.totalWeeks; i++) {
        const page = ctx.doc.addPage([ctx.width, ctx.height]);
        ctx.weeklyPageIndices.push(ctx.doc.getPageCount() - 1);

        drawNavigationTabs(page, ctx, -1);

        page.drawText(`Week ${i + 1}`, {
            x: 20,
            y: ctx.height - 30,
            size: 18,
            font: ctx.boldFont
        });

        // Draw Columns
        for (let col = 0; col < 8; col++) {
            const x = 20 + (col * colWidth);
            page.drawLine({
                start: { x, y: ctx.height - 50 },
                end: { x, y: 50 },
                thickness: 1,
                color: rgb(0.8, 0.8, 0.8)
            });

            if (col > 0) {
                // Calculate date for this column
                const colDate = new Date(currentWeekStart);
                colDate.setDate(colDate.getDate() + (col - 1));

                const dateStr = `${colDate.getDate()}`;
                const dayName = colDate.toLocaleDateString('en-US', { weekday: 'short' });

                page.drawText(`${dayName} ${dateStr}`, {
                    x: x + 5,
                    y: ctx.height - 45,
                    size: 10,
                    font: ctx.font
                });

                // Link to Daily Page
                if (colDate.getFullYear() === ctx.year) {
                    const dayOfYear = getDayOfYear(colDate);
                    ctx.links.push({
                        pageIndex: ctx.doc.getPageCount() - 1,
                        rect: [x, ctx.height - 60, x + colWidth, ctx.height - 40],
                        targetType: 'DAY',
                        targetId: dayOfYear
                    });
                }
            }
        }

        // Advance to next week
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
}

async function generateDailyPages(ctx: any) {
    const isLeap = (ctx.year % 4 === 0 && ctx.year % 100 !== 0) || (ctx.year % 400 === 0);
    const totalDays = isLeap ? 366 : 365;

    const startDate = new Date(ctx.year, 0, 1);

    for (let i = 0; i < totalDays; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);

        const page = ctx.doc.addPage([ctx.width, ctx.height]);
        ctx.dailyPageIndices.push(ctx.doc.getPageCount() - 1);

        drawNavigationTabs(page, ctx, currentDate.getMonth());

        // Header
        const dateString = currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        page.drawText(dateString, {
            x: 30,
            y: ctx.height - 40,
            size: 16,
            font: ctx.boldFont
        });

        // Grid Background - REMOVED as per user request
        /*
        const gridSize = 20;
        for (let x = 30; x < ctx.width - 50; x += gridSize) { 
            for (let y = 50; y < ctx.height - 60; y += gridSize) {
                page.drawCircle({
                    x, y, size: 1, color: rgb(0.8, 0.8, 0.8)
                });
            }
        }
        */

        // Timeline on Left
        for (let h = 6; h < 24; h++) {
            const y = ctx.height - 80 - ((h - 6) * 25);
            if (y > 50) {
                page.drawText(`${h}:00`, {
                    x: 35,
                    y,
                    size: 8,
                    font: ctx.font,
                    color: rgb(0.5, 0.5, 0.5)
                });
                page.drawLine({
                    start: { x: 60, y: y + 3 },
                    end: { x: ctx.width - 50, y: y + 3 },
                    thickness: 0.5,
                    color: rgb(0.9, 0.9, 0.9)
                });
            }
        }
    }
}

function drawNavigationTabs(page: PDFPage, ctx: any, activeMonthIndex: number) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const tabHeight = ctx.height / 12;
    const tabWidth = 30;
    const x = ctx.width - tabWidth;

    for (let i = 0; i < 12; i++) {
        const y = ctx.height - ((i + 1) * tabHeight);

        // Draw Tab Background
        const isActive = i === activeMonthIndex;
        page.drawRectangle({
            x,
            y,
            width: tabWidth,
            height: tabHeight,
            color: isActive ? rgb(0.2, 0.2, 0.2) : rgb(0.9, 0.9, 0.9),
            borderColor: rgb(0.5, 0.5, 0.5),
            borderWidth: 1
        });

        // Draw Label
        page.drawText(months[i], {
            x: x + 5,
            y: y + (tabHeight / 2) - 4,
            size: 8,
            font: ctx.font,
            color: isActive ? rgb(1, 1, 1) : rgb(0, 0, 0)
        });

        // Add Link
        ctx.links.push({
            pageIndex: ctx.doc.getPageCount() - 1,
            rect: [x, y, x + tabWidth, y + tabHeight],
            targetType: 'MONTH',
            targetId: i
        });
    }
}

function applyHyperlinks(ctx: any) {
    ctx.links.forEach((link: any) => {
        let targetPage = -1;

        if (link.targetType === 'DAY') {
            targetPage = ctx.dailyPageIndices[link.targetId];
        } else if (link.targetType === 'WEEK') {
            targetPage = ctx.weeklyPageIndices[link.targetId];
        } else if (link.targetType === 'MONTH') {
            targetPage = ctx.monthlyPageIndices[link.targetId];
        }

        if (targetPage >= 0) {
            const page = ctx.doc.getPage(link.pageIndex);

            // Create Link Annotation
            const linkAnnotation = ctx.doc.context.register(
                ctx.doc.context.obj({
                    Type: 'Annot',
                    Subtype: 'Link',
                    Rect: link.rect, // [llx, lly, urx, ury]
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
        }
    });
}

// Helper: Get Day of Year (0-indexed)
function getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay) - 1; // -1 because Jan 1 should be index 0? Wait.
    // Jan 1 - Jan 0 = 1 day. 
    // We want Jan 1 to be index 0.
    // diff for Jan 1 is 1 day (approx).
    // Let's verify.
    // Jan 1 2024. Start = Dec 31 2023. Diff = 24 hours.
    // Math.floor(24h / 24h) = 1.
    // So return 1 - 1 = 0. Correct.
}

// Helper: Get ISO Week Number
function getWeekNumber(d: Date): number {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}
