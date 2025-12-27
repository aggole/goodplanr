/**
 * Script to generate a comprehensive list of holidays needing English translation
 * Excludes CJK countries (JP, KR, CN, TW, HK)
 */

const Holidays = require('date-holidays');
const fs = require('fs');
const path = require('path');

// Countries that need English translation (non-CJK)
const translateCountries = [
    // Already English-speaking (for reference/check)
    { code: 'US', name: 'United States', lang: 'en' },
    { code: 'GB', name: 'United Kingdom', lang: 'en' },
    { code: 'CA', name: 'Canada', lang: 'en' },
    { code: 'AU', name: 'Australia', lang: 'en' },
    { code: 'NZ', name: 'New Zealand', lang: 'en' },
    { code: 'IE', name: 'Ireland', lang: 'en' },
    { code: 'SG', name: 'Singapore', lang: 'en' },
    { code: 'PH', name: 'Philippines', lang: 'en' },
    { code: 'IN', name: 'India', lang: 'en' },
    // European - needs translation
    { code: 'AT', name: 'Austria', lang: 'de' },
    { code: 'BE', name: 'Belgium', lang: 'multi' },
    { code: 'CH', name: 'Switzerland', lang: 'multi' },
    { code: 'CZ', name: 'Czech Republic', lang: 'cs' },
    { code: 'DE', name: 'Germany', lang: 'de' },
    { code: 'DK', name: 'Denmark', lang: 'da' },
    { code: 'ES', name: 'Spain', lang: 'es' },
    { code: 'FR', name: 'France', lang: 'fr' },
    { code: 'GR', name: 'Greece', lang: 'el' },
    { code: 'IT', name: 'Italy', lang: 'it' },
    { code: 'NL', name: 'Netherlands', lang: 'nl' },
    { code: 'NO', name: 'Norway', lang: 'no' },
    { code: 'PL', name: 'Poland', lang: 'pl' },
    { code: 'PT', name: 'Portugal', lang: 'pt' },
    { code: 'RO', name: 'Romania', lang: 'ro' },
    { code: 'SE', name: 'Sweden', lang: 'sv' },
    // Asia Pacific - needs translation
    { code: 'ID', name: 'Indonesia', lang: 'id' },
    // Middle East - needs translation (Arabic)
    { code: 'AE', name: 'United Arab Emirates', lang: 'ar' },
    { code: 'SA', name: 'Saudi Arabia', lang: 'ar' },
    // Americas - needs translation
    { code: 'BR', name: 'Brazil', lang: 'pt' },
    { code: 'MX', name: 'Mexico', lang: 'es' },
];

// CJK countries to skip (keep native language)
const cjkCountries = ['JP', 'KR', 'CN', 'TW', 'HK'];

// Existing abbreviations from holidays.ts
const existingAbbreviations = {
    // English
    'Administrative Professionals Day': 'Admin Prof Day',
    'Martin Luther King Jr. Day': 'MLK Day',
    'Day after Thanksgiving Day': 'Post-Thanksgvn',
    "Washington's Birthday": "Presidents Day",
    "St. Patrick's Day": "St. Patrick's",
    'Independence Day': 'Independence',
    'Thanksgiving Day': 'Thanksgiving',
    "Valentine's Day": "Valentine's",
    'National Heroes Day': 'Heroes Day',
    "New Year's Holiday": "New Year Hol",
    'Orthodox Christmas': 'Orthodox Xmas',
    'Chinese New Year': 'Chinese NY',
    'Islamic New Year': 'Islamic NY',
    "Queen's Birthday": 'Queen Bday',
    'Emancipation Day': 'Emancipation',
    'Constitution Day': 'Constitution',
    'Armed Forces Day': 'Armed Forces',
    'August Bank Holiday': 'August Bank',
    'Spring bank holiday': 'Spring Bank',
    "St. Brigid's Day": "Brigid's Day",
    "St. Stephen's Day": "Stephen Day",
    // German
    'Heilige Drei Könige': 'Hl. 3 Könige',
    'Christi Himmelfahrt': 'Himmelfahrt',
    'Mariä Himmelfahrt': 'Mariä Himmelf',
    'Nationalfeiertag': 'Nationalfeier',
    'Mariä Empfängnis': 'Mariä Empfäng',
    'Faschingsdienstag': 'Fasch.dienstag',
    '1. Weihnachtstag': '1. Weihnacht',
    '2. Weihnachtstag': '2. Weihnacht',
    // French
    'Lundi de Pentecôte': 'Lun Pentecôte',
    // Spanish
    'Día de los Difuntos': 'Día Difuntos',
    'Día del Trabajador': 'Día Trabajo',
    'Santiago Apostol': 'Santiago Ap.',
    'Todos los Santos': 'Todos Santos',
    // Portuguese
    'Sexta-Feira Santa': 'Sexta Santa',
    'Dia do trabalhador': 'Dia Trabalho',
    'Dia de Tiradentes': 'Tiradentes',
    'Imaculada Conceição': 'Imaculada C.',
    // Italian
    'Epifania del Signore': 'Epifania',
    'Santi Pietro e Paolo': 'Pietro e Paolo',
    'Domenica di Pasqua': 'Dom Pasqua',
    "Lunedì dell'Angelo": 'Lun Angelo',
    'Festa della mamma': 'Festa Mamma',
    'Festa del Lavoro': 'Festa Lavoro',
    // Arabic (already English)
    'رأس السنة الميلادية': 'New Year',
    'الإسراء والمعراج': 'Isra Miraj',
    'اليوم الأول من رمضان': 'Ramadan Start',
    'عيد الفطر': 'Eid al-Fitr',
    'عيد الأضحى': 'Eid al-Adha',
    'رأس السنة الهجرية': 'Islamic NY',
    'المولد النبويّ': 'Mawlid',
    'اليوم الوطني': 'National Day',
    'يوم التأسيس': 'Founding Day',
};


let output = '';
output += '# Holiday Translation List\n';
output += '## Non-CJK Countries - Proposed English Translations\n\n';
output += 'This list shows all holidays that need English translation or abbreviation.\n';
output += 'Holidays marked with ⚠️ are currently being truncated with "…" and NEED translation.\n';
output += 'Holidays marked with ✅ already have proper abbreviations.\n';
output += 'Holidays marked with 🔤 are already short enough in native language.\n\n';

let needsTranslation = [];

for (const country of translateCountries) {
    const holidayInstance = new Holidays(country.code);
    const holidays = holidayInstance.getHolidays(2025);

    if (!holidays || holidays.length === 0) continue;

    output += `---\n\n### 🇦🇪 ${country.name} (${country.code}) - ${country.lang.toUpperCase()}\n\n`;
    output += `| Original | Length | Status | Suggested English |\n`;
    output += `|----------|--------|--------|-------------------|\n`;

    for (const h of holidays) {
        const name = h.name || '';
        const len = name.length;

        // Check if already has abbreviation
        const hasAbbreviation = existingAbbreviations[name] !== undefined;
        // Check if already short
        const isShort = len <= 15;

        let status, suggested;

        if (hasAbbreviation) {
            status = '✅ Has abbrev';
            suggested = existingAbbreviations[name];
        } else if (isShort && country.lang === 'en') {
            status = '🔤 Already OK';
            suggested = name;
        } else if (isShort) {
            status = '🔤 Short native';
            suggested = '(keep or translate)';
        } else {
            status = '⚠️ NEEDS WORK';
            suggested = '**TODO**';
            needsTranslation.push({ country: country.code, name, len });
        }

        output += `| ${name.substring(0, 35)}${name.length > 35 ? '…' : ''} | ${len} | ${status} | ${suggested} |\n`;
    }
    output += '\n';
}

// Add summary of all holidays needing translation
output += `---\n\n## Summary: Holidays Needing English Translation\n\n`;
output += `Total: ${needsTranslation.length} holidays need translation\n\n`;
output += `| Country | Original Name | Length |\n`;
output += `|---------|---------------|--------|\n`;

for (const h of needsTranslation.sort((a, b) => a.country.localeCompare(b.country))) {
    output += `| ${h.country} | ${h.name.substring(0, 40)} | ${h.len} |\n`;
}

// Write to file
const outputPath = path.join(__dirname, 'holiday_translation_list.md');
fs.writeFileSync(outputPath, output, 'utf8');

console.log(`Generated translation list: ${outputPath}`);
console.log(`Total holidays needing translation: ${needsTranslation.length}`);
