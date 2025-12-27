
const { getHolidayDisplayName } = require('./lib/holidays.ts');

const tests = [
    { input: '农历新年假期', expected: '農曆新年假期' },
    { input: '国际妇女节', expected: '國際婦女節' },
    { input: '淸明節 (更换日)', expected: '淸明節 更換' }
];

let allPassed = true;

tests.forEach(({ input, expected }) => {
    const output = getHolidayDisplayName(input);
    const passed = output === expected;
    console.log(`Input: "${input}"`);
    console.log(`Output: "${output}"`);
    console.log(`Expected: "${expected}"`);
    console.log(passed ? '✅ Passed' : '❌ Failed');
    console.log('---');
    if (!passed) allPassed = false;
});

if (allPassed) {
    console.log('All holiday verification tests passed!');
} else {
    process.exit(1);
}
