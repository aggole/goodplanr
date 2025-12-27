/**
 * Holiday Helper Module
 * Uses date-holidays package to provide country-specific public holidays
 */

import Holidays from 'date-holidays';

// Maximum display length for holiday names (to fit in planner cells)
const MAX_HOLIDAY_LENGTH = 18;

// Comprehensive holiday name mapping - ALL translated to English
// For non-CJK countries, holidays are translated to English and abbreviated to fit ≤18 chars
// CJK countries (JP, KR, CN, TW, HK) keep native language as they're naturally short
const HOLIDAY_ABBREVIATIONS: Record<string, string> = {
    // ===================================================================
    // ENGLISH-SPEAKING COUNTRIES (US, GB, CA, AU, NZ, IE, SG, PH, IN)
    // Only abbreviations needed for long names
    // ===================================================================

    // United States
    'Administrative Professionals Day': 'Admin Prof Day',
    'Martin Luther King Jr. Day': 'MLK Day',
    'Day after Thanksgiving Day': 'Post-Thanksgiving',
    "Washington's Birthday": "Presidents Day",
    'Independence Day': 'Indep. Day',
    'Thanksgiving Day': 'Thanksgiving Day',

    // United Kingdom
    'Early May bank holiday': 'Early May Bank',
    'Spring bank holiday': 'Spring Bank',
    'August Bank Holiday': 'August Bank',

    // Canada
    "St. Patrick's Day": "St. Patrick's Day",
    'National Day for Truth and Reconciliation': 'Truth & Recon',

    // New Zealand
    "Day after New Year's Day": "New Year Day 2",

    // Ireland
    "St. Brigid's Day": "St. Brigid's Day",
    'First Monday in June': 'June Bank Hol',
    'First Monday in August': 'Aug Bank Hol',
    'October Bank Holiday': 'October Bank',
    "St. Stephen's Day": "St. Stephen's Day",
    "St Patrick's Day": "St. Patrick's Day",

    // Philippines
    'First Philippine Republic Day': 'PH Republic',
    'Lantern Festival': 'Lantern Fest',
    'EDSA Revolution Anniversary': 'EDSA Anniv',
    'End of Ramadan (Eid al-Fitr)': 'Eid al-Fitr',
    'Feast of the Sacrifice (Eid al-Adha)': 'Eid al-Adha',
    "José Rizal's birthday": 'Rizal Bday',
    'Iglesia ni Cristo Day': 'INC Day',
    'Ninoy Aquino Day': 'Aquino Day',
    "National Heroes' Day": 'Heroes Day',
    'Birthday of Muhammad (Mawlid)': 'Mawlid',
    'Mid-Autumn Festival': 'Mid-Autumn',
    'Feast of the Immaculate Conception of Mary': 'Immaculate C.',

    // India
    'Ambedkar Jayanti': 'Ambedkar Day',

    // Singapore
    'Chinese New Year': 'Chinese NY',

    // Common English
    "Valentine's Day": "Valentine's",
    'Constitution Day': 'Constitution',
    'Islamic New Year': 'Islamic NY',

    // Common holidays - short forms for "Obs" suffix
    "New Year's Day": 'New Year',
    'Christmas Day': 'Christmas',
    'Easter Sunday': 'Easter Sun',
    'Easter Monday': 'Easter Mon',
    "Mother's Day": "Mother's",
    "Father's Day": "Father's",
    'National Day': 'Natnl Day',

    // Unicode curly apostrophe versions (char 8217)
    "St. Patrick\u2019s Day": 'St Patrick',
    "St. Brigid\u2019s Day": 'St Brigid',
    "Lune\u00e8 dell\u2019Angelo": 'Easter Monday',
    'Boxing Day': 'Boxing Day',
    'Good Friday': 'Good Friday',
    'Labour Day': 'Labour Day',
    'Waitangi Day': 'Waitangi',
    'ANZAC Day': 'ANZAC Day',
    'Queens Birthday': 'Queen Bday',
    "King's Birthday": 'King Bday',
    'Deepavali': 'Deepavali',
    'Vesak Day': 'Vesak',
    'Hari Raya Puasa': 'H Raya Puasa',
    'Hari Raya Haji': 'H Raya Haji',
    'Republic Day': 'Republic Day',

    // Additional edge cases
    "San Francesco d'Assisi": 'S. Francesco',
    'Feast of the Immaculate Conception of the Blessed Virgin Mary': 'Immaculate C.',
    "Dzie\u0144 Pami\u0119ci Ofiar Holocaustu i Powstania w Getcie Warszawskim": 'Holocaust Day',
    'Ziua Rom\u00e2nilor de Pretutindeni, Ziua Rom\u00e2nului de Pretutindeni': 'Diaspora Day',
    '\u4e2d\u83ef\u6c11\u570b\u958b\u570b\u7d00\u5ff5\u65e5 / \u5143\u65e6': 'New Year',

    // ===================================================================
    // GERMAN-SPEAKING (DE, AT, CH) → Translated to English
    // ===================================================================

    // Common German holidays
    'Neujahr': 'New Year',
    'Heilige Drei Könige': 'Epiphany',
    'Valentinstag': "Valentine's",
    'Weiberfastnacht': "Women's Crnvl",
    'Rosenmontag': 'Rose Monday',
    'Faschingsdienstag': 'Shrove Tue',
    'Aschermittwoch': 'Ash Wednesday',
    'Gründonnerstag': 'Maundy Thurs',
    'Karfreitag': 'Good Friday',
    'Karsamstag': 'Holy Saturday',
    'Ostersonntag': 'Easter Sunday',
    'Ostermontag': 'Easter Monday',
    'Maifeiertag': 'Labour Day',
    'Staatsfeiertag': 'National Day',
    'Muttertag': "Mother's Day",
    'Christi Himmelfahrt': 'Ascension Day',
    'Pfingstsonntag': 'Whit Sunday',
    'Pfingstmontag': 'Whit Monday',
    'Fronleichnam': 'Corpus Christi',
    'Mariä Himmelfahrt': 'Assumption',
    'Tag der Deutschen Einheit': 'German Unity',
    'Nationalfeiertag': 'National Day',
    'Allerheiligen': "All Saints'",
    'Allerseelen': "All Souls'",
    'Sankt Martin (Faschingsbeginn)': "St. Martin's",
    'Volkstrauertag': 'Memorial Day',
    'Buß- und Bettag': 'Repentance',
    'Totensonntag': 'Eternity Sun',
    '1. Advent': '1st Advent',
    '2. Advent': '2nd Advent',
    '3. Advent': '3rd Advent',
    '4. Advent': '4th Advent',
    'Heiliger Abend': 'Christmas Eve',
    '1. Weihnachtstag': 'Christmas Day',
    '2. Weihnachtstag': 'Boxing Day',
    'Christtag': 'Christmas Day',
    'Stefanitag': "St. Stephen's",
    'Silvester': "New Year's Eve",
    'Mariä Empfängnis': 'Immaculate C.',
    'Auffahrt': 'Ascension Day',
    'Vätertag': "Father's Day",
    'Bundesfeiertag': 'National Day',
    'Weihnachtstag': 'Christmas Day',
    'Stephanstag': "St. Stephen's",

    // Switzerland specific
    'Eidg. Dank-, Buss- und Bettag': 'Prayer Day',

    // ===================================================================
    // FRENCH-SPEAKING (FR, BE partial) → Translated to English
    // ===================================================================

    'Nouvel An': 'New Year',
    "l'Épiphanie": 'Epiphany',
    'Saint-Valentin': "Valentine's",
    'Pâques': 'Easter',
    'Lundi de Pâques': 'Easter Monday',
    'Fête du travail': 'Labour Day',
    'Fête des Mères': "Mother's Day",
    'Ascension': 'Ascension Day',
    'Pentecôte': 'Whit Sunday',
    'Lundi de Pentecôte': 'Whit Monday',
    'Fête nationale': 'National Day',
    'Assomption': 'Assumption',
    'Toussaint': "All Saints'",
    'Fête des morts': "All Souls'",
    'Armistice': 'Armistice Day',
    'Fête du Roi': "King's Day",
    'Saint-Nicolas': "St. Nicholas",
    'Noël': 'Christmas',
    'Fête de la Victoire 1945': 'VE Day',
    'Fête Nationale de la France': 'Bastille Day',
    'Armistice 1918': 'Armistice Day',

    // ===================================================================
    // SPANISH-SPEAKING (ES, MX) → Translated to English
    // ===================================================================

    'Año Nuevo': 'New Year',
    'Día de los Reyes Magos': 'Epiphany',
    'San José': "St. Joseph's",
    'Jueves Santo': 'Maundy Thurs',
    'Viernes Santo': 'Good Friday',
    'Pascua': 'Easter',
    'Día del Trabajador': 'Labour Day',
    'Día de la Madre': "Mother's Day",
    'Pentecostés': 'Whit Sunday',
    'Santiago Apostol': "St. James'",
    'Asunción': 'Assumption',
    'Fiesta Nacional de España': 'Spain Nat',
    'Fiesta Nacional de España (día sustituto)': 'Spain NatObs',
    'Todos los Santos': "All Saints'",
    'Día de la Constitución Española': 'Constit. ES',
    'La inmaculada concepción': 'Immaculate C.',
    'Navidad': 'Christmas',

    // Mexico specific
    'Día de la Constitución': 'Const. Day MX',
    'Natalicio de Benito Juárez': 'Juárez Day',
    'Día de la Independencia': 'Independence',
    'Día de los Difuntos': "All Souls'",
    'Día de la Revolución': 'Revolution Day',
    'Día de la Virgen de Guadalupe': 'Guadalupe Day',

    // ===================================================================
    // PORTUGUESE-SPEAKING (PT, BR) → Translated to English
    // ===================================================================

    'Ano Novo': 'New Year',
    'Carnaval': 'Carnival',
    'Sexta-Feira Santa': 'Good Friday',
    'Páscoa': 'Easter',
    'Dia da Liberdade': 'Freedom Day',
    'Dia do trabalhador': 'Labour Day',
    'Dia das Mães': "Mother's Day",
    'Dia de Portugal': 'Portugal Day',
    'Corpo de Deus': 'Corpus Christi',
    'Assunção de Maria': 'Assumption',
    'Implantação da República': 'Republic Day',
    'Todos os santos': "All Saints'",
    'Restauração da Independência': 'Restoration',
    'Imaculada Conceição': 'Immaculate C.',
    'Noite de Natal': 'Christmas Eve',
    'Natal': 'Christmas',
    'Véspera de Ano Novo': "New Year's Eve",

    // Brazil specific
    'Dia de Tiradentes': 'Tiradentes',
    'Dia dos Namorados': "Valentine's",
    'Dia dos Pais': "Father's Day",
    'Dia da Independência': 'Independence',
    'Nossa Senhora Aparecida': 'Aparecida Day',
    'Dia de Finados': "All Souls'",
    'Proclamação da República': 'Republic Day',
    'Dia da Consciência Negra': 'Black Aware',

    // ===================================================================
    // ITALIAN (IT) → Translated to English
    // ===================================================================

    'Capodanno': 'New Year',
    'Befana': 'Epiphany',
    'Domenica di Pasqua': 'Easter',
    "Lunedì dell'Angelo": 'Easter Monday',
    'Anniversario della Liberazione': 'Liberation',
    'Festa del Lavoro': 'Labour Day',
    'Festa della mamma': "Mother's Day",
    'Festa della Repubblica': 'Republic Day',
    'Ferragosto': 'Assumption',
    'Ognissanti': "All Saints'",
    'Immacolata Concezione': 'Immaculate C.',
    'Natale': 'Christmas',
    'Santo Stefano': "St. Stephen's",

    // ===================================================================
    // DUTCH (NL) → Translated to English
    // ===================================================================

    'Nieuwjaar': 'New Year',
    'Goede Vrijdag': 'Good Friday',
    'Pasen': 'Easter',
    'Tweede paasdag': 'Easter Monday',
    'Koningsdag': "King's Day",
    'Nationale Dodenherdenking': 'Remembrance',
    'Bevrijdingsdag': 'Liberation',
    'Moederdag': "Mother's Day",
    'Hemelvaartsdag': 'Ascension Day',
    'Pinksteren': 'Whit Sunday',
    'Tweede pinksterdag': 'Whit Monday',
    'Vaderdag': "Father's Day",
    'Prinsjesdag': "Prince's Day",
    'Sint-Maarten': "St. Martin's",
    'Sinterklaasavond': "St. Nicholas",
    'Koninkrijksdag': 'Kingdom Day',
    'Kerstmis': 'Christmas',
    'Tweede kerstdag': 'Boxing Day',
    'Oudejaarsavond': "New Year's Eve",

    // ===================================================================
    // SCANDINAVIAN (NO, SE, DK) → Translated to English
    // ===================================================================

    // Norway
    'Første nyttårsdag': 'New Year',
    'H.K.H. prinsesse Ingrid Alexandra': 'Princess Day',
    'Samefolkets dag': 'Sami Day',
    'Morsdag': "Mother's Day",
    'Valentinsdag': "Valentine's",
    'H.M. kong Harald V': 'King Bday',
    'Fastelavn': 'Fastelavns',
    'Askeonsdag': 'Ash Wednesday',
    'Kvinnedagen': "Women's Day",
    'Aprilsnarr': "April Fools'",
    'Palmesøndag': 'Palm Sunday',
    'Skjærtorsdag': 'Maundy Thurs',
    'Langfredag': 'Good Friday',
    'Første påskedag': 'Easter Sunday',
    'Andre påskedag': 'Easter Monday',
    'Arbeidernes dag': 'Labour Day',
    'Frigjøringsdagen': 'Liberation',
    'Grunnlovsdagen': 'Const. Day',
    'Kristi himmelfartsdag': 'Ascension Day',
    'Unionsoppløsningen': 'Union Dissol',
    'Første pinsedag': 'Whit Sunday',
    'Andre pinsedag': 'Whit Monday',
    'Sankthansaften': "St. John's Eve",
    'H.M. dronning Sonja': 'Queen Bday',
    'H.K.H. kronprins Haakon Magnus': 'Prince Bday',
    'Olsok': "St. Olaf's",
    'H.K.H. kronprinsesse Mette-Marit': 'Princess Bday',
    'Allehelgensaften': 'All Hallows',
    'Farsdag': "Father's Day",
    'Første søndag i advent': '1st Advent',
    'Andre søndag i advent': '2nd Advent',
    'Tredje søndag i advent': '3rd Advent',
    'Fjerde søndag i advent': '4th Advent',
    'Julaften': 'Christmas Eve',
    'Første Juledag': 'Christmas Day',
    'Andre juledag': 'Boxing Day',
    'Nyttårsaften': "New Year's Eve",

    // Sweden
    'Nyårsdagen': 'New Year',
    'Trettondagsafton': 'Epiphany Eve',
    'Trettondedag jul': 'Epiphany',
    'Tjugondag Knut': 'Knut Day',
    'Vasaloppet': 'Vasa Race',
    'Marie Bebådelsedag': 'Annunciation',
    'Skärtorsdagen': 'Maundy Thurs',
    'Långfredagen': 'Good Friday',
    'Påskafton': 'Easter Eve',
    'Påskdagen': 'Easter Sunday',
    'Annandag påsk': 'Easter Monday',
    'Valborgsmässoafton': 'Walpurgis',
    'Första Maj': 'Labour Day',
    'Mors dag': "Mother's Day",
    'Kristi himmelfärdsdag': 'Ascension Day',
    'Sveriges nationaldag': 'Sweden Day',
    'Pingstafton': 'Whit Eve',
    'Pingstdagen': 'Whit Sunday',
    'Annandag pingst': 'Whit Monday',
    'Midsommarafton': 'Midsummer Eve',
    'Midsommardagen': 'Midsummer',
    'Allhelgonaafton': 'All Saints Eve',
    'Alla Helgons dag': "All Saints'",
    'Gustav-Adolf-dagen': 'Gustaf Adolf',
    'Mårtensgås': "Martin's Day",
    'Nobeldagen': 'Nobel Day',
    'Luciadagen': 'St. Lucia',
    'Julafton': 'Christmas Eve',
    'Juldagen': 'Christmas Day',
    'Annandag jul': 'Boxing Day',
    'Nyårsafton': "New Year's Eve",

    // Denmark
    'Nytår': 'New Year',
    'Skærtorsdag': 'Maundy Thurs',
    // 'Langfredag' already mapped in Norway section
    'Påskesøndag': 'Easter Sunday',
    'Anden påskedag': 'Easter Monday',
    '1. maj': 'Labour Day',
    'Mors Dag': "Mother's Day",
    'Kristi Himmelfartsdag': 'Ascension Day',
    'Grundlovsdag': 'Const. Day',
    'Pinsedag': 'Whit Sunday',
    'Anden Pinsedag': 'Whit Monday',
    'Juleaften': 'Christmas Eve',
    'Juledag': 'Christmas Day',
    'Anden Juledag': 'Boxing Day',

    // ===================================================================
    // CZECH (CZ) → Translated to English
    // ===================================================================

    'Nový rok a Den obnovy samostatného českého státu': 'New Year',
    'Škaredá středa': 'Spy Wednesday',
    'Zelený čtvrtek': 'Maundy Thurs',
    'Velký pátek': 'Good Friday',
    'Bílá sobota': 'Holy Saturday',
    'Velikonoční neděle': 'Easter Sunday',
    'Velikonoční pondělí': 'Easter Monday',
    'Svátek práce': 'Labour Day',
    'Den vítězství': 'Victory Day',
    'Den matek': "Mother's Day",
    'Den slovanských věrozvěstů Cyrila a Metoděje': 'Cyril & Meth',
    'Den upálení mistra Jana Husa': 'Jan Hus Day',
    'Den české státnosti': 'Statehood',
    'Den vzniku samostatného československého státu': 'Czech Indep',
    'Den boje za svobodu a demokracii': 'Freedom Day',
    'Štědrý den': 'Christmas Eve',
    '1. svátek vánoční': 'Christmas Day',
    '2. svátek vánoční': 'Boxing Day',

    // ===================================================================
    // POLISH (PL) → Translated to English
    // ===================================================================

    'Nowy Rok': 'New Year',
    'Święto Trzech Króli': 'Epiphany',
    'Dzień Babci': "Grandma's Day",
    'Dzień Dziadka': "Grandpa's Day",
    'Walentynki': "Valentine's",
    'Dzień Nauki Polskiej': 'PL Science Day',
    'Tłusty Czwartek': 'Fat Thursday',
    'Narodowy Dzień Pamięci „Żołnierzy Wyklętych"': 'Soldiers Day',
    'Ostatki': 'Shrove Tue',
    'Środa Popielcowa': 'Ash Wednesday',
    'Dzień Kobiet': "Women's Day",
    'Dzień Mężczyzny': "Men's Day",
    'Pierwszy Dzień Wiosny / Dzień Wagarowicza': 'Spring Day',
    'Narodowy Dzień Pamięci Polaków ratujących Żydów pod okupacją niemiecką': 'Rescuers Day',
    'Niedziela Palmowa': 'Palm Sunday',
    'Święto Chrztu Polski': 'Baptism of PL',
    'Wielki Czwartek': 'Maundy Thurs',
    'Wielki Piątek': 'Good Friday',
    'Dzień Pamięci Ofiar Holocaustu i Pogromu Kieleckiego': 'Holocaust Day',
    'Wielka Sobota': 'Holy Saturday',
    'Niedziela Wielkanocna': 'Easter Sunday',
    'Drugi dzień Wielkanocy': 'Easter Monday',
    'Dzień Ziemi': 'Earth Day',
    'Święto Państwowe; Święto Pracy': 'Labour Day',
    'Dzień Flagi Rzeczypospolitej Polskiej': 'Flag Day PL',
    'Święto Narodowe Trzeciego Maja': 'Const. Day PL',
    'Narodowy Dzień Zwycięstwa': 'Victory Day',
    'Dzień Europy': 'Europe Day',
    'Dzień Matki': "Mother's Day",
    'Dzień Dziecka': "Children's Day",
    'Zielone Świątki': 'Whit Sunday',
    'Dzień Walki i Męczeństwa Wsi Polskiej': 'Martyrs Day',
    'Dzień Bożego Ciała': 'Corpus Christi',
    'Dzień Ojca': "Father's Day",
    'Narodowy Dzień Pamięci Powstania Warszawskiego': 'Warsaw Uprsg',
    'Wniebowzięcie Najświętszej Maryi Panny': 'Assumption',
    'Dzień Solidarności i Wolności': 'Solidarity',
    'Rocznica wybuchu II wojny światowej': 'WWII Start',
    'Rocznica agresji ZSRR na Polskę': 'Soviet Inv',
    'Dzień Chłopaka': "Boy's Day",
    'Narodowy Dzień Pamięci Duchownych Niezłomnych': 'Priests Day',
    'Wszystkich Świętych': "All Saints'",
    'Narodowe Święto Niepodległości': 'Independence',
    'Mikołajki': "St. Nicholas",
    'Wigilia Bożego Narodzenia': 'Christmas Eve',
    'Pierwszy dzień Bożego Narodzenia': 'Christmas Day',
    'Drugi dzień Bożego Narodzenia': 'Boxing Day',
    'Narodowy Dzień Pamięci Zwycięskiego Powstania Wielkopolskiego': 'Uprising Day',
    'Sylwester': "New Year's Eve",

    // ===================================================================
    // ROMANIAN (RO) → Translated to English
    // ===================================================================

    'Anul nou': 'New Year',
    'Bobotează': 'Epiphany',
    'Sfântul Ion': "St. John's",
    'Ziua Unirii Principatelor Române': 'Union Day RO',
    'Ziua Mamei': "Women's Day",
    'Vinerea Mare': 'Good Friday',
    'Paștele': 'Easter',
    'A doua zi de Pasti': 'Easter Monday',
    'Ziua muncii': 'Labour Day',
    'Ziua Românilor de Pretutindeni, Ziua Copilului': 'Diaspora Day',
    'Ziua Eroilor': 'Heroes Day',
    'Ziua Copilului': "Children's Day",
    'Rusaliile': 'Whit Sunday',
    'A doua zi de Rusalii': 'Whit Monday',
    'Ziua drapelului national': 'Flag Day RO',
    'Ziua Imnului național': 'Anthem Day',
    'Adormirea Maicii Domnului': 'Assumption',
    'Sfântul Andrei': "St. Andrew's",
    'Ziua națională, Ziua Marii Uniri': 'Great Union',
    'Ziua Constituției': 'Const. Day RO',
    'Crăciunul': 'Christmas',
    'A doua zi de Crăciun': 'Boxing Day',

    // ===================================================================
    // GREEK (GR) → Translated to English
    // ===================================================================

    'Πρωτοχρονιά': 'New Year',
    'Θεοφάνεια': 'Epiphany',
    'Καθαρά Δευτέρα': 'Clean Monday',
    'Ευαγγελισμός, Εθνική Εορτή': 'Annunciation',
    'Μεγάλη Παρασκευή': 'Good Friday',
    'Πάσχα': 'Easter',
    'Δευτέρα του Πάσχα': 'Easter Monday',
    'Εργατική Πρωτομαγιά': 'Labour Day',
    'Γιορτή της μητέρας': "Mother's Day",
    'Πεντηκοστή': 'Whit Sunday',
    'Αγίου Πνεύματος': 'Whit Monday',
    'Κοίμηση της Θεοτόκου': 'Assumption',
    'Επέτειος του Όχι': 'Oxi Day',
    'Χριστούγεννα': 'Christmas',
    'Δεύτερη μέρα των Χριστουγέννων': 'Boxing Day',

    // ===================================================================
    // INDONESIAN (ID) → Translated to English
    // ===================================================================

    'Hari tahun baru': 'New Year',
    'Maulid Nabi Muhammad': 'Mawlid',
    'Tahun Baru Imlek': 'Chinese NY',
    'Hari Raya Nyepi': 'Nyepi',
    'Hari Raya Idul Fitri': 'Eid al-Fitr',
    'Wafat Yesus Kristus': 'Good Friday',
    'Hari Buruh Internasional': 'Labour Day',
    'Hari Raya Waisak': 'Vesak',
    'Kenaikan Yesus Kristus': 'Ascension Day',
    'Hari Lahir Pancasila': 'Pancasila Day',
    'Hari Raya Idul Adha': 'Eid al-Adha',
    'Tahun Baru Islam': 'Islamic NY',
    'Hari Ulang Tahun Kemerdekaan Republik Indonesia': 'Independence',
    'Hari Raya Natal': 'Christmas',

    // ===================================================================
    // ARABIC (AE, SA) → Translated to English
    // ===================================================================

    'رأس السنة الميلادية': 'New Year',
    'الإسراء والمعراج': 'Isra Miraj',
    'اليوم الأول من رمضان': 'Ramadan Start',
    'عيد الفطر': 'Eid al-Fitr',
    'عيد الأضحى': 'Eid al-Adha',
    'رأس السنة الهجرية': 'Islamic NY',
    'المولد النبويّ': 'Mawlid',
    'اليوم الوطني': 'National Day',
    'يوم التأسيس': 'Founding Day',

    // China - remove duplicate traditional Chinese
    '清明节 清明節': '清明节',
};


/**
 * Get the display name for a holiday (abbreviated if too long)
 * @param name Original holiday name
 * @param maxLength Maximum allowed length (default: 15)
 */
export function getHolidayDisplayName(name: string, maxLength: number = MAX_HOLIDAY_LENGTH): string {
    const trimmed = name.trim();

    // Handle substitute/observed days with LOCALIZED suffixes
    // Returns appropriate suffix based on the original language pattern
    const substitutePatternMap: Array<{ pattern: RegExp, suffix: string, suffixLength: number }> = [
        // Japanese: 振替 (furikae = substitute)
        { pattern: /\s*\(振替休日\)$/, suffix: ' 振替', suffixLength: 3 },
        // Taiwanese/Chinese: 更换 (gēnghuàn = substitute)
        { pattern: /\s*\(更换日\)$/, suffix: ' 更换', suffixLength: 3 },
        // Spanish: sust. (sustituto)
        { pattern: /\s*\(día sustituto\)$/i, suffix: ' (sust.)', suffixLength: 8 },
        // English variants: (obs.) = shorter version of "observed"
        { pattern: /\s*\(substitute day\)$/i, suffix: ' (obs.)', suffixLength: 7 },
        { pattern: /\s*\(observed\)$/i, suffix: ' (obs.)', suffixLength: 7 },
        { pattern: /\s*\(lieu day\)$/i, suffix: ' (obs.)', suffixLength: 7 },
        { pattern: /\s*\(in lieu\)$/i, suffix: ' (obs.)', suffixLength: 7 },
        { pattern: /\s*\(day in lieu\)$/i, suffix: ' (obs.)', suffixLength: 7 },
        { pattern: /\s*substitute day$/i, suffix: ' (obs.)', suffixLength: 7 },
    ];

    for (const { pattern, suffix, suffixLength } of substitutePatternMap) {
        if (pattern.test(trimmed)) {
            // Remove the substitute pattern to get base holiday name
            const baseHoliday = trimmed.replace(pattern, '').trim();
            // Get abbreviated version of base holiday
            let shortName = HOLIDAY_ABBREVIATIONS[baseHoliday] || baseHoliday;
            // Truncate if still too long to fit with localized suffix
            const maxBaseName = maxLength - suffixLength;
            if (shortName.length > maxBaseName) {
                shortName = shortName.substring(0, maxBaseName - 1) + '…';
            }
            return shortName + suffix;
        }
    }

    // Check if we have a predefined abbreviation
    if (HOLIDAY_ABBREVIATIONS[trimmed]) {
        return HOLIDAY_ABBREVIATIONS[trimmed];
    }

    // If name is already short enough, return as-is
    if (trimmed.length <= maxLength) {
        return trimmed;
    }

    // Intelligent truncation: try to break at word boundary
    const truncated = trimmed.substring(0, maxLength - 1);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > maxLength * 0.5) {
        // Break at word boundary if it's not too far from the end
        return truncated.substring(0, lastSpace) + '…';
    }

    // Otherwise, just truncate with ellipsis
    return truncated + '…';
}

export interface Holiday {
    date: Date;
    dateString: string; // YYYY-MM-DD format for timezone-safe comparison
    name: string;
    type: 'public' | 'bank' | 'observance' | 'optional';
    localName?: string;
}

export interface HolidaySettings {
    countryCode: string;
    showPublic: boolean;
    showBank: boolean;
    showObservance: boolean;
    displayStyle: 'highlight' | 'label' | 'dot' | 'all';
}

// Cache for holiday lookups to avoid repeated calculations
const holidayCache: Map<string, Holiday[]> = new Map();

/**
 * Get global cultural days that should show for all countries
 * These are commonly celebrated worldwide but not in date-holidays for most countries
 */
function getGlobalCulturalDays(year: number): Holiday[] {
    const culturalDays: Holiday[] = [];

    // Valentine's Day - Feb 14 (fixed)
    culturalDays.push({
        date: new Date(year, 1, 14),
        dateString: `${year}-02-14`,
        name: "Valentine's Day",
        type: 'observance',
        localName: "Valentine's Day"
    });

    // Mother's Day - 2nd Sunday of May (US/most countries)
    const may1 = new Date(year, 4, 1);
    const may1Day = may1.getDay();
    const firstSundayMay = may1Day === 0 ? 1 : 8 - may1Day;
    const mothersDayDate = firstSundayMay + 7; // 2nd Sunday
    culturalDays.push({
        date: new Date(year, 4, mothersDayDate),
        dateString: `${year}-05-${String(mothersDayDate).padStart(2, '0')}`,
        name: "Mother's Day",
        type: 'observance',
        localName: "Mother's Day"
    });

    // Father's Day - 3rd Sunday of June (US/most countries)
    const june1 = new Date(year, 5, 1);
    const june1Day = june1.getDay();
    const firstSundayJune = june1Day === 0 ? 1 : 8 - june1Day;
    const fathersDayDate = firstSundayJune + 14; // 3rd Sunday
    culturalDays.push({
        date: new Date(year, 5, fathersDayDate),
        dateString: `${year}-06-${String(fathersDayDate).padStart(2, '0')}`,
        name: "Father's Day",
        type: 'observance',
        localName: "Father's Day"
    });

    // Halloween - Oct 31 (fixed)
    culturalDays.push({
        date: new Date(year, 9, 31),
        dateString: `${year}-10-31`,
        name: "Halloween",
        type: 'observance',
        localName: "Halloween"
    });

    return culturalDays;
}

/**
 * Get all holidays for a given year and country
 */
export function getHolidaysForYear(year: number, countryCode: string): Holiday[] {
    const cacheKey = `${year}-${countryCode}`;

    if (holidayCache.has(cacheKey)) {
        return holidayCache.get(cacheKey)!;
    }

    try {
        const hd = new Holidays(countryCode);
        const rawHolidays = hd.getHolidays(year);

        const holidays: Holiday[] = rawHolidays
            .filter((h: any) => h.type && ['public', 'bank', 'observance', 'optional'].includes(h.type))
            .map((h: any) => {
                // Extract YYYY-MM-DD directly from the library's date string (e.g., "2025-07-04 00:00:00")
                // This avoids timezone conversion issues when using new Date()
                const dateStr = typeof h.date === 'string' ? h.date.substring(0, 10) : '';
                return {
                    date: new Date(h.date),
                    dateString: dateStr, // Store the raw date string for comparison
                    name: h.name,
                    type: h.type as Holiday['type'],
                    localName: h.name
                };
            });

        // Add global cultural days that aren't in the library for this country
        const globalDays = getGlobalCulturalDays(year);
        for (const gd of globalDays) {
            // Only add if not already present (some countries like US already have these)
            const exists = holidays.some(h => h.dateString === gd.dateString);
            if (!exists) {
                holidays.push(gd);
            }
        }

        // Sort by date
        holidays.sort((a, b) => a.date.getTime() - b.date.getTime());

        holidayCache.set(cacheKey, holidays);
        return holidays;
    } catch (error) {
        console.warn(`Failed to get holidays for ${countryCode}:`, error);
        return [];
    }
}

/**
 * Check if a specific date is a holiday
 */
export function isHoliday(date: Date, countryCode: string, settings?: Partial<HolidaySettings>): Holiday | null {
    const year = date.getFullYear();
    const holidays = getHolidaysForYear(year, countryCode);

    // Create dateString from the input date's local components
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    // Compare using the pre-computed dateString field (timezone-safe)
    const holiday = holidays.find(h => h.dateString === dateStr);

    if (!holiday) return null;

    // Filter by type if settings provided
    if (settings) {
        if (holiday.type === 'public' && settings.showPublic === false) return null;
        if (holiday.type === 'bank' && settings.showBank === false) return null;
        if (holiday.type === 'observance' && settings.showObservance === false) return null;
    }

    return holiday;
}

/**
 * Get list of supported countries with their names
 */
export function getSupportedCountries(): { code: string; name: string }[] {
    const hd = new Holidays();
    const countries = hd.getCountries();

    return Object.entries(countries).map(([code, name]) => ({
        code,
        name: name as string
    })).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get holidays for a specific month
 */
export function getHolidaysForMonth(year: number, month: number, countryCode: string): Holiday[] {
    const holidays = getHolidaysForYear(year, countryCode);

    // Use dateString for timezone-safe filtering
    // month is 0-indexed, so add 1 for comparison with YYYY-MM-DD format
    const monthStr = String(month + 1).padStart(2, '0');
    const yearStr = String(year);

    return holidays.filter(h => {
        // Extract year and month from dateString (YYYY-MM-DD)
        const parts = h.dateString.split('-');
        return parts[0] === yearStr && parts[1] === monthStr;
    });
}

/**
 * Clear the holiday cache (useful for testing or memory management)
 */
export function clearHolidayCache(): void {
    holidayCache.clear();
}
