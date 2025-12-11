
const year = 2025;
const startDay = 'Monday'; // User setting
const index = 0; // Week 1 (0-based)

// Logic from lib/planner.ts
const jan1 = new Date(year, 0, 1);
const currentDay = jan1.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed...
const targetDay = startDay === 'Monday' ? 1 : 0;
let diff = (currentDay - targetDay + 7) % 7;

// Jan 1 2025 is a Wednesday (3).
// targetDay = 1 (Monday).
// diff = (3 - 1 + 7) % 7 = 2.
// Dec 30 is 2 days before Jan 1.

const firstWeekStart = new Date(year, 0, 1 - diff);
const weekDate = new Date(firstWeekStart);
weekDate.setDate(firstWeekStart.getDate() + (index * 7));

console.log('Year:', year);
console.log('Start Day:', startDay);
console.log('Jan 1 Day Index:', currentDay);
console.log('Diff calculated:', diff);
console.log('First Week Start:', firstWeekStart.toDateString());
console.log('Week 1 Date (index 0):', weekDate.toDateString());
