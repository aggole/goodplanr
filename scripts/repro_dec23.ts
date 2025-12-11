
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function check(year, startDay) {
    const jan1 = new Date(year, 0, 1);
    const floatDay = jan1.getDay();
    const targetDay = startDay === 'Monday' ? 1 : 0;
    let diff = (floatDay - targetDay + 7) % 7;
    const firstWeekStart = new Date(year, 0, 1 - diff);

    // Check if First Week Start is Dec 23
    // Dec 23 2024 is...
    // Month 11 (Dec), Day 23.
    // Year 2024? (If input year is 2025).

    if (firstWeekStart.getFullYear() === 2024 && firstWeekStart.getMonth() === 11 && firstWeekStart.getDate() === 23) {
        console.log(`FOUND HIT: Year=${year}, Start=${startDay} -> FirstWeek=${firstWeekStart.toDateString()}`);
    } else {
        // console.log(`Year=${year}, Start=${startDay} -> ${firstWeekStart.toDateString()}`);
    }
}

const years = [2024, 2025, 2026];
const days = ['Monday', 'Sunday'];

years.forEach(y => {
    days.forEach(d => check(y, d));
});
