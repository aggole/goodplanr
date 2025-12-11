// Calendar utility functions for mapping dates to template coordinates

import { Coordinate } from './schemas/monthly';

/**
 * Maps calendar dates to coordinate positions based on the calendar layout
 * @param daysInMonth - Number of days in the month (28-31)
 * @param startDayOfWeek - Day of week for the 1st of the month (0=Sun, 1=Mon, etc.)
 * @param weekStartDay - Whether the week starts on Monday or Sunday
 * @param coordinates - Array of available coordinate positions (should be 35-42 positions for a 5-6 week calendar)
 * @returns Array of date-to-coordinate mappings
 */
export function mapDatesToCoordinates(
    daysInMonth: number,
    startDayOfWeek: number,
    weekStartDay: 'Monday' | 'Sunday',
    coordinates: Coordinate[]
): Array<{ date: number; coord: Coordinate }> {
    const result: Array<{ date: number; coord: Coordinate }> = [];

    // Calculate the offset (which cell the 1st of the month falls in)
    let offset: number;

    if (weekStartDay === 'Monday') {
        // If week starts Monday: Mon=0, Tue=1, ..., Sun=6
        // Convert from JS day (0=Sun, 1=Mon, ..., 6=Sat)
        offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    } else {
        // If week starts Sunday: Sun=0, Mon=1, ..., Sat=6
        offset = startDayOfWeek;
    }

    // Map each date to its coordinate position
    for (let date = 1; date <= daysInMonth; date++) {
        const position = offset + (date - 1);

        // Safety check: ensure we have a coordinate for this position
        if (position < coordinates.length) {
            result.push({
                date,
                coord: coordinates[position]
            });
        }
    }

    return result;
}

/**
 * Sorts coordinates by their visual position (top-to-bottom, left-to-right)
 * This ensures coordinates are in calendar order
 */
export function sortCoordinatesByPosition(coords: Coordinate[]): Coordinate[] {
    return [...coords].sort((a, b) => {
        // Sort by Y (descending, since PDF Y increases from bottom)
        // Then by X (ascending, left to right)
        if (Math.abs(a.y - b.y) > 10) {
            return b.y - a.y; // Higher Y first (top of page)
        }
        return a.x - b.x; // Then left to right
    });
}

/**
 * Gets the number of days in a month
 */
export function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

/**
 * Gets the day of week for the first day of a month
 * @returns 0=Sunday, 1=Monday, ..., 6=Saturday
 */
export function getFirstDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 1).getDay();
}

export function getMonthInfo(year: number, month: number) {
    const date = new Date(year, month, 1);
    return {
        name: date.toLocaleString('default', { month: 'long' }),
        days: getDaysInMonth(year, month),
        startDay: getFirstDayOfMonth(year, month)
    };
}

export function getCalendarDates(year: number, month: number, startDay: 'Monday' | 'Sunday') {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const dates = [];

    // Calculate offset
    let offset = startDay === 'Monday' ? (firstDay === 0 ? 6 : firstDay - 1) : firstDay;

    // Previous month filler
    // (Simplified: just returning current month dates for now, can expand if needed)

    for (let i = 1; i <= daysInMonth; i++) {
        dates.push(i);
    }

    return { dates, offset };
}

export function getWeeksInYear(year: number) {
    // ISO 8601 weeks
    const d = new Date(year, 11, 31);
    const week = getWeekNumber(d);
    return week === 1 ? 52 : week;
}

function getWeekNumber(d: Date) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}

export function getDayOfYear(year: number, month: number, day: number): number {
    const start = new Date(year, 0, 0);
    const diff = new Date(year, month, day).getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

export function getDateFromDayOfYear(year: number, dayOfYear: number): Date {
    const date = new Date(year, 0);
    date.setDate(dayOfYear + 1);
    return date;
}
