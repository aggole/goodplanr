
const Holidays = require('date-holidays');
const hd = new Holidays('HK');

const holidays = hd.getHolidays(2026);

console.log('--- Hong Kong (HK) Holidays 2026 ---');
holidays.forEach(h => {
    console.log(`Date: ${h.date} | Name: ${h.name}`);
});
