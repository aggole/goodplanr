
const Holidays = require('date-holidays');
const hd = new Holidays('TW');

// Get holidays for 2026
const holidays = hd.getHolidays(2026);

console.log('--- TW Holidays 2026 (February) ---');
holidays.filter(h => h.date.startsWith('2026-02')).forEach(h => {
    console.log(`Date: ${h.date}`);
    console.log(`Name (en): ${h.name}`);
    console.log(`Name (local):`, h.names); // Check all names
    console.log('---');
});
