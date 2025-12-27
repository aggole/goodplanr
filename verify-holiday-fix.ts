
const { getHolidayDisplayName } = require('./lib/holidays.ts');

const input = '农历新年假期';
const output = getHolidayDisplayName(input);

console.log(`Input: ${input}`);
console.log(`Output: ${output}`);

if (output === '農曆新年假期') {
    console.log('✅ Fix verified!');
} else {
    console.log('❌ Fix failed.');
}
