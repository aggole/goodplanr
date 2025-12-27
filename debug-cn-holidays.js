
const Holidays = require('date-holidays');
const hd = new Holidays('CN');

const holidays = hd.getHolidays(2026);

console.log('--- China (CN) Holidays 2026 ---');
holidays.forEach(h => {
    console.log(`Date: ${h.date} | Name: ${h.name}`);
});
