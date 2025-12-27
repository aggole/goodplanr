/**
 * Generate holiday files for all 35 countries with complete translations
 * This script mirrors the exact HOLIDAY_ABBREVIATIONS from holidays.ts
 */

const Holidays = require('date-holidays');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'holiday_names');
const MAX_HOLIDAY_LENGTH = 18;

// Complete HOLIDAY_ABBREVIATIONS from holidays.ts
const HOLIDAY_ABBREVIATIONS = {
    // ENGLISH-SPEAKING COUNTRIES
    'Administrative Professionals Day': 'Admin Prof Day',
    'Martin Luther King Jr. Day': 'MLK Day',
    'Day after Thanksgiving Day': 'Post-Thanksgiving',
    "Washington's Birthday": "Presidents Day",
    'Independence Day': 'Independence Day',
    'Thanksgiving Day': 'Thanksgiving Day',
    'Early May bank holiday': 'Early May Bank',
    'Spring bank holiday': 'Spring Bank',
    'August Bank Holiday': 'August Bank',
    "St. Patrick's Day": "St. Patrick's Day",
    "St Patrick's Day": "St. Patrick's Day",
    'National Day for Truth and Reconciliation': 'Truth&Recon',
    "Day after New Year's Day": 'NY Day 2',
    "St. Brigid's Day": "St Brigid",
    'First Monday in June': 'June Bank',
    'First Monday in August': 'Aug Bank',
    'October Bank Holiday': 'Oct Bank',
    "St. Stephen's Day": "St Stephen",
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
    'Ambedkar Jayanti': 'Ambedkar Day',
    'Chinese New Year': 'Chinese NY',
    "Valentine's Day": "Valentine's",
    'Constitution Day': 'Constitution',
    'Islamic New Year': 'Islamic NY',

    // Holidays that need short forms when (obs.) is appended
    // Max 11 chars for base name + 7 for ' (obs.)' = 18
    'Independence Day': 'Indep. Day',
    'Christmas Day': 'Christmas',
    'Boxing Day': 'Boxing Day',
    "New Year's Day": 'New Year',
    'Juneteenth': 'Juneteenth',
    'Waitangi Day': 'Waitangi',
    'ANZAC Day': 'ANZAC Day',
    "St. Stephen's Day": 'St Stephen',
    'Chinese New Year': 'Chinese NY',
    "Día de la Constitución Española": 'Const. ES',
    'Fiesta Nacional de España': 'Spain Nat',
    'Todos los Santos': "All Saints",
    'Queens Birthday': 'Queen Bday',
    "King's Birthday": 'King Bday',
    'Deepavali': 'Deepavali',
    'Vesak Day': 'Vesak',
    'Hari Raya Puasa': 'H Raya Puasa',

    // Common holidays that need short forms for "Obs" suffix
    // The original 'Independence Day' and 'Christmas Day' etc. entries are now redundant
    // and will be overwritten by the more specific ones above.
    // Keeping the comment for context, but the actual entries are moved/updated.
    // "New Year's Day": 'New Year', // Redundant
    // 'Christmas Day': 'Christmas', // Redundant
    // 'Boxing Day': 'Boxing Day', // Redundant
    'Easter Sunday': 'Easter Sun',
    'Easter Monday': 'Easter Mon',
    'Good Friday': 'Good Friday',
    "Mother's Day": "Mother's",
    "Father's Day": "Father's",
    'Labour Day': 'Labour Day',
    // 'Waitangi Day': 'Waitangi', // Redundant
    // 'ANZAC Day': 'ANZAC Day', // Redundant
    // 'Queens Birthday': 'Queen Bday', // Redundant
    // "King's Birthday": 'King Bday', // Redundant
    // 'Deepavali': 'Deepavali', // Redundant
    // 'Vesak Day': 'Vesak', // Redundant
    // 'Hari Raya Puasa': 'H Raya Puasa', // Redundant
    'Hari Raya Haji': 'H Raya Haji',
    'National Day': 'Natnl Day',
    'Republic Day': 'Republic',
    'Juneteenth': 'Juneteenth',
    'Memorial Day': 'Memorial',
    'Columbus Day': 'Columbus',
    'Veterans Day': 'Veterans',
    'Labor Day': 'Labor Day',
    'Matariki': 'Matariki',
    'Gandhi Jayanti': 'Gandhi Day',
    'Santi Pietro e Paolo': 'SS Pietro',
    "San Marino's Day": 'San Marino',
    "All Saints' Day": "All Saints'",
    'Liberation Day': 'Liberation',

    // Additional fixes for remaining ellipsis issues
    "San Francesco d'Assisi": 'S. Francesco',
    'Feast of the Immaculate Conception of the Blessed Virgin Mary': 'Immaculate C.',
    'Dzień Pamięci Ofiar Holocaustu i Powstania w Getcie Warszawskim': 'Holocaust Day',
    'Ziua Românilor de Pretutindeni, Ziua Românului de Pretutindeni': 'Diaspora Day',
    '中華民國開國紀念日 / 元旦': 'New Year',
    "Lunedì dell'Angelo": 'Easter Monday',
    'Narodowy Dzień Pamięci „Żołnierzy Wyklętych"': 'Soldiers Day',
    'Sankt Martin (Faschingsbeginn)': "St. Martin's",
    "St. Brigid's Day": 'St Brigid',

    // Unicode curly apostrophe versions (\u2019 = char 8217)
    "St. Patrick\u2019s Day": 'St Patrick',
    "St. Brigid\u2019s Day": 'St Brigid',
    "Lunedì dell\u2019Angelo": 'Easter Monday',
    "Narodowy Dzień Pamięci \u201EŻołnierzy Wyklętych\u201D": 'Soldiers Day',

    // GERMAN-SPEAKING
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
    'Eidg. Dank-, Buss- und Bettag': 'Prayer Day',

    // FRENCH-SPEAKING
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

    // SPANISH-SPEAKING
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
    'Todos los Santos': 'All Saints',
    'Día de la Constitución Española': 'Const. ES',
    'La inmaculada concepción': 'Immaculate C.',
    'Navidad': 'Christmas',
    'Día de la Constitución': 'Const. Day MX',
    'Natalicio de Benito Juárez': 'Juárez Day',
    'Día de la Independencia': 'Independence',
    'Día de los Difuntos': "All Souls'",
    'Día de la Revolución': 'Revolution Day',
    'Día de la Virgen de Guadalupe': 'Guadalupe Day',

    // PORTUGUESE-SPEAKING
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
    'Dia de Tiradentes': 'Tiradentes',
    'Dia dos Namorados': "Valentine's",
    'Dia dos Pais': "Father's Day",
    'Dia da Independência': 'Independence',
    'Nossa Senhora Aparecida': 'Aparecida Day',
    'Dia de Finados': "All Souls'",
    'Proclamação da República': 'Republic Day',
    'Dia da Consciência Negra': 'Black Aware',

    // ITALIAN
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

    // DUTCH
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

    // SCANDINAVIAN
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
    'Juldagen': 'Christmas Day',
    'Annandag jul': 'Boxing Day',
    'Nyårsafton': "New Year's Eve",
    'Nytår': 'New Year',
    'Skærtorsdag': 'Maundy Thurs',
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

    // CZECH
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

    // POLISH
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

    // ROMANIAN
    'Anul nou': 'New Year',
    'Bobotează': 'Epiphany',
    'Sfântul Ion': "St. John's",
    'Ziua Unirii Principatelor Române': 'Union Day RO',
    'Ziua Mamei': "Mother's Day",
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

    // GREEK
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

    // INDONESIAN
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

    // ARABIC
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

// Substitute patterns with LOCALIZED suffixes
const substitutePatternMap = [
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

function getHolidayDisplayName(name) {
    const trimmed = name.trim();

    // Handle substitute/observed days with localized suffixes
    for (const { pattern, suffix, suffixLength } of substitutePatternMap) {
        if (pattern.test(trimmed)) {
            const baseHoliday = trimmed.replace(pattern, '').trim();
            let shortName = HOLIDAY_ABBREVIATIONS[baseHoliday] || baseHoliday;
            const maxBaseName = MAX_HOLIDAY_LENGTH - suffixLength;
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
    if (trimmed.length <= MAX_HOLIDAY_LENGTH) {
        return trimmed;
    }

    // Truncate (should not happen if abbreviations are complete)
    const truncated = trimmed.substring(0, MAX_HOLIDAY_LENGTH - 1);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > MAX_HOLIDAY_LENGTH * 0.5) {
        return truncated.substring(0, lastSpace) + '…';
    }
    return truncated + '…';
}

// Countries from the GoodPlanr app
const appCountries = [
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'AT', name: 'Austria' },
    { code: 'BE', name: 'Belgium' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'CZ', name: 'Czech Republic' },
    { code: 'DE', name: 'Germany' },
    { code: 'DK', name: 'Denmark' },
    { code: 'ES', name: 'Spain' },
    { code: 'FR', name: 'France' },
    { code: 'GR', name: 'Greece' },
    { code: 'IE', name: 'Ireland' },
    { code: 'IT', name: 'Italy' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'NO', name: 'Norway' },
    { code: 'PL', name: 'Poland' },
    { code: 'PT', name: 'Portugal' },
    { code: 'RO', name: 'Romania' },
    { code: 'SE', name: 'Sweden' },
    { code: 'CN', name: 'China' },
    { code: 'HK', name: 'Hong Kong' },
    { code: 'ID', name: 'Indonesia' },
    { code: 'IN', name: 'India' },
    { code: 'JP', name: 'Japan' },
    { code: 'KR', name: 'South Korea' },
    { code: 'NZ', name: 'New Zealand' },
    { code: 'PH', name: 'Philippines' },
    { code: 'SG', name: 'Singapore' },
    { code: 'TW', name: 'Taiwan' },
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'SA', name: 'Saudi Arabia' },
    { code: 'BR', name: 'Brazil' },
    { code: 'MX', name: 'Mexico' },
];

// Years to check (covers substitute days)
const years = [2025, 2026, 2027];

// Ensure output directory exists and clear it
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}
const existingFiles = fs.readdirSync(outputDir);
for (const file of existingFiles) {
    fs.unlinkSync(path.join(outputDir, file));
}

console.log(`Generating holiday files for ${appCountries.length} countries (years ${years.join(', ')})...\n`);

let totalIssues = 0;

for (const country of appCountries) {
    try {
        const holidayInstance = new Holidays(country.code);

        // Collect all unique holidays across all years
        const allHolidays = new Map();
        for (const year of years) {
            const holidays = holidayInstance.getHolidays(year);
            for (const h of holidays) {
                if (!allHolidays.has(h.name)) {
                    allHolidays.set(h.name, h);
                }
            }
        }

        const holidays = Array.from(allHolidays.values());

        if (!holidays || holidays.length === 0) {
            console.log(`No holidays found for ${country.code} (${country.name})`);
            continue;
        }

        let content = `Holiday Names for ${country.name} (${country.code})\n`;
        content += `${'='.repeat(90)}\n\n`;
        content += `Original Name                                    → Display Name        (Len)\n`;
        content += `${'-'.repeat(90)}\n`;

        const sortedHolidays = [...holidays].sort((a, b) =>
            (b.name?.length || 0) - (a.name?.length || 0)
        );

        let issues = [];

        for (const holiday of sortedHolidays) {
            const originalName = holiday.name || 'Unknown';
            const displayName = getHolidayDisplayName(originalName);
            const hasEllipsis = displayName.includes('…');
            const tooLong = displayName.length > MAX_HOLIDAY_LENGTH;

            let marker = '  ';
            if (tooLong) {
                marker = '❌';
                issues.push({ original: originalName, display: displayName });
            } else if (hasEllipsis) {
                marker = '⚠️';
                issues.push({ original: originalName, display: displayName });
            }

            content += `${marker} ${originalName.substring(0, 45).padEnd(45)} → ${displayName.padEnd(15)} (${displayName.length})\n`;
        }

        content += `\n${'='.repeat(90)}\n`;
        content += `Total: ${holidays.length} holidays\n`;

        if (issues.length > 0) {
            content += `\n⚠️ ISSUES FOUND: ${issues.length}\n`;
            for (const issue of issues) {
                content += `  "${issue.original}" → "${issue.display}"\n`;
            }
            totalIssues += issues.length;
        } else {
            content += `✅ All holidays fit within 15 chars\n`;
        }

        const fileName = `${country.code}_${country.name.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
        const filePath = path.join(outputDir, fileName);
        fs.writeFileSync(filePath, content, 'utf8');

        const status = issues.length > 0 ? `⚠️ ${issues.length} issues` : '✅';
        console.log(`${status} ${fileName}`);

    } catch (error) {
        console.error(`Error processing ${country.code}: ${error.message}`);
    }
}

console.log(`\n${'='.repeat(50)}`);
if (totalIssues === 0) {
    console.log('✅ ALL COUNTRIES PASSED - No ellipsis or too-long names!');
} else {
    console.log(`❌ TOTAL ISSUES: ${totalIssues} (check individual files)`);
}
console.log(`Files saved to: ${outputDir}`);
