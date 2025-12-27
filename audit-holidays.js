/**
 * Script to audit all countries for substitute/observed day issues
 */

const Holidays = require('date-holidays');

const countries = ['US', 'GB', 'CA', 'AU', 'AT', 'BE', 'CH', 'CZ', 'DE', 'DK', 'ES', 'FR', 'GR', 'IE', 'IT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SE', 'CN', 'HK', 'ID', 'IN', 'JP', 'KR', 'NZ', 'PH', 'SG', 'TW', 'AE', 'SA', 'BR', 'MX'];
const years = [2025, 2026, 2027, 2028];

// Current substitute patterns in holidays.ts
const substitutePatterns = [
    /\s*\(substitute day\)$/i,
    /\s*\(observed\)$/i,
    /\s*\(lieu day\)$/i,
    /\s*\(in lieu\)$/i,
    /\s*\(day in lieu\)$/i,
    /\s*substitute day$/i,
    /\s*\(día sustituto\)$/i
];

console.log('Checking for unhandled substitute/observed patterns...');
console.log('='.repeat(70));

let unhandledPatterns = [];

for (const code of countries) {
    const hd = new Holidays(code);
    for (const year of years) {
        const holidays = hd.getHolidays(year);
        for (const h of holidays) {
            const name = h.name;
            // Check for parenthetical patterns that look like observed/substitute
            const parenMatch = name.match(/\(([^)]+)\)$/);
            if (parenMatch) {
                // Check if it matches any known pattern
                let matched = false;
                for (const pattern of substitutePatterns) {
                    if (pattern.test(name)) {
                        matched = true;
                        break;
                    }
                }
                if (!matched) {
                    const key = code + ': ' + name;
                    if (!unhandledPatterns.includes(key)) {
                        unhandledPatterns.push(key);
                    }
                }
            }
        }
    }
}

if (unhandledPatterns.length === 0) {
    console.log('✓ No unhandled substitute patterns found!');
} else {
    console.log('Found', unhandledPatterns.length, 'holidays with unhandled patterns:');
    unhandledPatterns.forEach(u => console.log('  ', u));
}

console.log('\n' + '='.repeat(70));
console.log('Checking abbreviations that would be too long with " Obs" suffix...');
console.log('='.repeat(70));

// Updated abbreviations from holidays.ts
const HOLIDAY_ABBREVIATIONS = {
    'Día de la Constitución Española': 'Constit. ES',
    'Administrative Professionals Day': 'Admin Prof',
    'Martin Luther King Jr. Day': 'MLK Day',
    'Day after Thanksgiving Day': 'Post-Thanks',
    "Washington's Birthday": "Presidents",
    'Independence Day': 'Independnce',
    'Thanksgiving Day': 'Thanksgivng',
    'Early May bank holiday': 'Early May',
    'Spring bank holiday': 'Spring Bank',
    'August Bank Holiday': 'August Bank',
    "St. Patrick's Day": "St Patrick",
    'National Day for Truth and Reconciliation': 'Truth&Recon',
    "Day after New Year's Day": 'NY Day 2',
    "St. Brigid's Day": "St Brigid's",
    'First Monday in June': 'June Bank',
    'First Monday in August': 'Aug Bank',
    'October Bank Holiday': 'Oct Bank',
    "St. Stephen's Day": "St Stephen",
    'Chinese New Year': 'Chinese NY',
    'Fiesta Nacional de España': 'Spain Nat Day',
};

let tooLongAbbrevs = [];
for (const [original, abbrev] of Object.entries(HOLIDAY_ABBREVIATIONS)) {
    const withObs = abbrev + ' Obs';
    if (withObs.length > 15) {
        tooLongAbbrevs.push({ original, abbrev, withObs, length: withObs.length });
    }
}

if (tooLongAbbrevs.length === 0) {
    console.log('✓ All abbreviations fit within 15 chars when " Obs" is added!');
} else {
    console.log('Found', tooLongAbbrevs.length, 'abbreviations too long with " Obs":');
    tooLongAbbrevs.forEach(t => console.log(`  "${t.original}" -> "${t.withObs}" (${t.length} chars)`));
}
