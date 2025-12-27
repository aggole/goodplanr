
const Holidays = require('date-holidays');
const hd = new Holidays('TW');

const holidays = hd.getHolidays(2026);

console.log('--- TW Holidays 2026 (ALL) ---');
holidays.forEach(h => {
    console.log(`Date: ${h.date} | Name: ${h.name}`);
});

