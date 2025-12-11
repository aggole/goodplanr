/**
 * Holiday Helper Module
 * Uses date-holidays package to provide country-specific public holidays
 */

import Holidays from 'date-holidays';

export interface Holiday {
    date: Date;
    name: string;
    type: 'public' | 'bank' | 'observance' | 'optional';
    localName?: string;
}

export interface HolidaySettings {
    countryCode: string;
    showPublic: boolean;
    showBank: boolean;
    showObservance: boolean;
    displayStyle: 'highlight' | 'label' | 'dot' | 'all';
}

// Cache for holiday lookups to avoid repeated calculations
const holidayCache: Map<string, Holiday[]> = new Map();

/**
 * Get all holidays for a given year and country
 */
export function getHolidaysForYear(year: number, countryCode: string): Holiday[] {
    const cacheKey = `${year}-${countryCode}`;

    if (holidayCache.has(cacheKey)) {
        return holidayCache.get(cacheKey)!;
    }

    try {
        const hd = new Holidays(countryCode);
        const rawHolidays = hd.getHolidays(year);

        const holidays: Holiday[] = rawHolidays
            .filter((h: any) => h.type && ['public', 'bank', 'observance', 'optional'].includes(h.type))
            .map((h: any) => ({
                date: new Date(h.date),
                name: h.name,
                type: h.type as Holiday['type'],
                localName: h.name
            }));

        holidayCache.set(cacheKey, holidays);
        return holidays;
    } catch (error) {
        console.warn(`Failed to get holidays for ${countryCode}:`, error);
        return [];
    }
}

/**
 * Check if a specific date is a holiday
 */
export function isHoliday(date: Date, countryCode: string, settings?: Partial<HolidaySettings>): Holiday | null {
    const year = date.getFullYear();
    const holidays = getHolidaysForYear(year, countryCode);

    const dateStr = date.toISOString().split('T')[0];

    const holiday = holidays.find(h => {
        const holidayStr = h.date.toISOString().split('T')[0];
        return holidayStr === dateStr;
    });

    if (!holiday) return null;

    // Filter by type if settings provided
    if (settings) {
        if (holiday.type === 'public' && settings.showPublic === false) return null;
        if (holiday.type === 'bank' && settings.showBank === false) return null;
        if (holiday.type === 'observance' && settings.showObservance === false) return null;
    }

    return holiday;
}

/**
 * Get list of supported countries with their names
 */
export function getSupportedCountries(): { code: string; name: string }[] {
    const hd = new Holidays();
    const countries = hd.getCountries();

    return Object.entries(countries).map(([code, name]) => ({
        code,
        name: name as string
    })).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get holidays for a specific month
 */
export function getHolidaysForMonth(year: number, month: number, countryCode: string): Holiday[] {
    const holidays = getHolidaysForYear(year, countryCode);

    return holidays.filter(h => {
        return h.date.getFullYear() === year && h.date.getMonth() === month;
    });
}

/**
 * Clear the holiday cache (useful for testing or memory management)
 */
export function clearHolidayCache(): void {
    holidayCache.clear();
}
