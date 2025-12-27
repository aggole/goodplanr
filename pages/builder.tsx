import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import Draggable, { DraggableData } from 'react-draggable';

// Dynamically import PDF viewer to avoid SSR issues
const Document = dynamic(() => import('react-pdf').then(mod => mod.Document), { ssr: false });
const Page = dynamic(() => import('react-pdf').then(mod => mod.Page), { ssr: false });

// Helper for numeric inputs
const NumberInput = ({ value, onValueChange, className, step = 1, ...props }: { value: number, onValueChange: (val: number) => void, className?: string, step?: number | string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) => {
    const [strVal, setStrVal] = useState(value?.toString() || '');

    useEffect(() => {
        // Only update from parent if the parsed local value doesn't match parent 
        // (avoids cursor jumping or overwriting partial inputs like "-")
        if (parseFloat(strVal) !== value) {
            setStrVal(value?.toString() || '');
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setStrVal(v);
        const num = parseFloat(v);
        if (!isNaN(num)) onValueChange(num);
    };

    const handleBlur = () => {
        // Reset to parent value on blur if invalid
        if (isNaN(parseFloat(strVal))) {
            setStrVal(value?.toString() || '');
        } else {
            setStrVal(parseFloat(strVal).toString()); // formatting
        }
    };

    return <input type="number" step={step} value={strVal} onChange={handleChange} onBlur={handleBlur} className={className} {...props} />;
};

export interface PlaceholderConfig {
    id: string;
    type: string;
    label: string;
    x: number;
    y: number;
    style?: {
        font: string;
        fontSize: number;
        textTransform?: 'uppercase' | 'none';
        align?: 'left' | 'center' | 'right';
        letterSpacing?: number;
        color?: string; // Add color support
    };
    grid?: {
        cols: number; // useful for fixed layouts like nav tabs
        rows: number;
        width: number;
        height: number;
        paddingX: number;
        paddingY: number;
        holidayOffsetY?: number; // Y offset for holiday labels below week dates
        holidayOffsetX?: number; // X offset for holiday labels
        holidayFontSize?: number; // Font size for holiday labels
    };
}

// Helper component for Draggable items
const DraggableItem = ({
    ph,
    isSelected,
    onSelect,
    removePlaceholder,
    updatePlaceholderPosition,
    children
}: {
    ph: PlaceholderConfig,
    isSelected: boolean,
    onSelect: () => void,
    removePlaceholder: (id: string) => void,
    updatePlaceholderPosition: (id: string, data: DraggableData) => void,
    children?: React.ReactNode
}) => {
    const nodeRef = useRef<HTMLDivElement>(null);

    return (
        <Draggable
            nodeRef={nodeRef as React.RefObject<HTMLElement>}
            position={{ x: ph.x, y: ph.y }}
            onStart={() => onSelect()}
            onStop={(e, data) => updatePlaceholderPosition(ph.id, data)}
        >
            <div
                ref={nodeRef}
                className="absolute cursor-move group hover:z-50 pointer-events-auto"
                onMouseDown={(e) => {
                    e.stopPropagation();
                    onSelect();
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`
                    flex flex-col items-start px-2 py-1 rounded shadow-sm border backdrop-blur-[1px]
                    ${isSelected
                        ? 'bg-indigo-600 border-indigo-400 text-white z-50 shadow-xl'
                        : 'bg-indigo-500/30 border-indigo-500/50 text-indigo-900'
                    }
                    hover:opacity-100
                    ${!isSelected && 'opacity-60 hover:bg-opacity-80'}
                `}>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold tracking-wide">{ph.label}</span>
                        {isSelected && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removePlaceholder(ph.id);
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="bg-black/20 hover:bg-black/40 text-white rounded-full w-4 h-4 flex items-center justify-center transition-colors ml-1"
                            >
                                <span className="text-xs leading-none mb-0.5">×</span>
                            </button>
                        )}
                    </div>
                    {children}
                    {isSelected && (
                        <span className="text-[9px] opacity-70 font-mono mt-1">x:{Number(ph.x).toFixed(1)} y:{Number(ph.y).toFixed(1)}</span>
                    )}
                </div>
            </div>
        </Draggable>
    );
};

export default function PlannerBuilder() {
    const [activeTab, setActiveTab] = useState<'yearly' | 'overview' | 'monthly' | 'weekly' | 'daily' | 'mini' | 'global' | 'subpages'>('monthly');
    const [files, setFiles] = useState<{ [key: string]: File | null }>({
        yearly: null,
        overview: null,
        monthly: null,
        weekly: null,
        daily: null,
        global: null
    });
    const [pdfScale, setPdfScale] = useState<number>(1);

    // START OVER: Clean state
    const [placeholders, setPlaceholders] = useState<{
        yearly: PlaceholderConfig[];
        overview: PlaceholderConfig[]; // Added overview
        monthly: PlaceholderConfig[];
        weekly: PlaceholderConfig[];
        daily: PlaceholderConfig[];
        mini: PlaceholderConfig[];
        global: PlaceholderConfig[];
        subpages: PlaceholderConfig[];
    }>({
        yearly: [],
        overview: [],
        monthly: [],
        weekly: [],
        daily: [],
        mini: [],
        global: [],
        subpages: []
    });
    // Sub Page Configuration
    const [extras, setExtras] = useState<{
        grid: { count: number };
        dot: { count: number };
        line: { count: number };
        blank: { count: number };
    }>({
        grid: { count: 10 },
        dot: { count: 10 },
        line: { count: 10 },
        blank: { count: 10 }
    });

    const [numPages, setNumPages] = useState<number>(0);
    const [year, setYear] = useState<number>(2025);
    const [startDay, setStartDay] = useState<'Monday' | 'Sunday'>('Monday');
    const [plannerType, setPlannerType] = useState<'classic' | 'veho' | 'vertical'>('classic');
    const pdfWrapperRef = useRef<HTMLDivElement>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Custom Element State
    const [customName, setCustomName] = useState('');
    const [customType, setCustomType] = useState<'text' | 'grid'>('text');

    // Holiday Settings
    const [holidayCountry, setHolidayCountry] = useState<string>('');
    const [holidayShowPublic, setHolidayShowPublic] = useState(true);
    const [holidayShowBank, setHolidayShowBank] = useState(true);
    const [holidayShowObservance, setHolidayShowObservance] = useState(false);
    const [holidayDisplayStyle, setHolidayDisplayStyle] = useState<'highlight' | 'label' | 'dot' | 'all'>('all');

    // Popular countries for quick selection
    const popularCountries = [
        { code: '', name: 'None (No holidays)' },
        { code: 'US', name: 'United States' },
        { code: 'GB', name: 'United Kingdom' },
        { code: 'CA', name: 'Canada' },
        { code: 'AU', name: 'Australia' },
        { code: 'JP', name: 'Japan' },
        { code: 'KR', name: 'South Korea' },
        { code: 'DE', name: 'Germany' },
        { code: 'FR', name: 'France' },
        { code: 'IT', name: 'Italy' },
        { code: 'ES', name: 'Spain' },
        { code: 'BR', name: 'Brazil' },
        { code: 'MX', name: 'Mexico' },
        { code: 'IN', name: 'India' },
        { code: 'CN', name: 'China' },
        { code: 'SG', name: 'Singapore' },
        { code: 'NZ', name: 'New Zealand' },
        { code: 'NL', name: 'Netherlands' },
        { code: 'SE', name: 'Sweden' },
        { code: 'NO', name: 'Norway' },
        { code: 'PH', name: 'Philippines' },
        { code: 'TW', name: 'Taiwan' },
        { code: 'HK', name: 'Hong Kong' },
    ];

    useEffect(() => {
        import('react-pdf').then(mod => {
            mod.pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs?v=5.4.296';
        });

        // Auto-load config from server
        const restoreConfig = async (type: string = 'classic') => {
            try {
                const res = await fetch(`/api/load-config?type=${type}`);
                if (res.ok) {
                    const json = await res.json();
                    // Restore state
                    if (json.placeholders) {
                        setPlaceholders(prev => ({
                            ...prev,
                            ...json.placeholders
                        }));
                    }
                    if (json.year) setYear(json.year);
                    if (json.startDay) setStartDay(json.startDay);
                    if (json.activeTab) setActiveTab(json.activeTab);
                    if (json.extras) setExtras(json.extras);
                    // Restore holiday settings
                    if (json.holidaySettings) {
                        if (json.holidaySettings.countryCode) setHolidayCountry(json.holidaySettings.countryCode);
                        if (json.holidaySettings.showPublic !== undefined) setHolidayShowPublic(json.holidaySettings.showPublic);
                        if (json.holidaySettings.showBank !== undefined) setHolidayShowBank(json.holidaySettings.showBank);
                        if (json.holidaySettings.showObservance !== undefined) setHolidayShowObservance(json.holidaySettings.showObservance);
                        if (json.holidaySettings.displayStyle) setHolidayDisplayStyle(json.holidaySettings.displayStyle);
                    }
                    console.log(`${type} settings restored successfully.`);
                } else {
                    // Reset to empty if no config found for this type
                    console.log(`No config found for ${type}, starting fresh.`);
                }
            } catch (error) {
                console.warn('Could not restore settings:', error);
            }
        };
        restoreConfig('classic'); // Load classic on initial mount
    }, []);

    // Reload config when planner type changes
    useEffect(() => {
        const loadConfigForType = async () => {
            try {
                const res = await fetch(`/api/load-config?type=${plannerType}`);
                if (res.ok) {
                    const json = await res.json();
                    if (json.placeholders) {
                        setPlaceholders(prev => ({ ...prev, ...json.placeholders }));
                    }
                    if (json.year) setYear(json.year);
                    if (json.startDay) setStartDay(json.startDay);
                    if (json.activeTab) setActiveTab(json.activeTab);
                    if (json.extras) setExtras(json.extras);
                    if (json.holidaySettings) {
                        setHolidayCountry(json.holidaySettings.countryCode || '');
                        setHolidayShowPublic(json.holidaySettings.showPublic ?? true);
                        setHolidayShowBank(json.holidaySettings.showBank ?? true);
                        setHolidayShowObservance(json.holidaySettings.showObservance ?? false);
                        setHolidayDisplayStyle(json.holidaySettings.displayStyle || 'all');
                    }
                    console.log(`Loaded ${plannerType} config`);
                } else {
                    // Reset placeholders for new planner type
                    setPlaceholders({ yearly: [], overview: [], monthly: [], weekly: [], daily: [], mini: [], global: [], subpages: [] });
                    console.log(`No config for ${plannerType}, starting fresh`);
                }
            } catch (error) {
                console.warn(`Error loading ${plannerType} config:`, error);
            }
        };
        // Skip initial mount (handled by first useEffect)
        if (plannerType !== 'classic' || document.readyState === 'complete') {
            loadConfigForType();
        }
    }, [plannerType]);

    const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
        const file = event.target.files?.[0];
        if (file) {
            setFiles(prev => ({ ...prev, [type]: file }));
            const formData = new FormData();
            formData.append('file', file);
            try {
                await fetch(`/api/upload-template?type=${type}`, { method: 'POST', body: formData });
            } catch (error) {
                console.error('Upload error', error);
                alert('Error uploading template');
            }
        }
    };

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    const availablePlaceholders: Record<string, { type: string, label: string }[]> = {
        mini: [
            { type: 'MINI_CAL_TITLE', label: 'Month Title' },
            { type: 'MINI_CAL_HEADER', label: 'Week Header (M T W...)' },
            { type: 'MINI_CAL_GRID', label: 'Dates (1-31)' },
        ],
        yearly: [
            { type: 'NAVIGATION_TABS', label: 'Navigation Tabs' },
            { type: 'MINI_CALENDAR_INSTANCE', label: 'Mini Calendar' },
            { type: 'YEAR_LABEL', label: 'Year Label' }
        ],
        overview: [
            { type: 'NAVIGATION_TABS', label: 'Navigation Tabs' },
            { type: 'VERTICAL_MONTH_GRID', label: 'Vertical Grid (Date/Day)' },
            { type: 'YEAR_LABEL', label: 'Year Label' },
            { type: 'MONTH_NAME', label: 'Month Names (1x6 Grid)' }
        ],
        monthly: [
            { type: 'NAVIGATION_TABS', label: 'Navigation Tabs' },
            { type: 'MONTH_LABEL', label: 'Month Label' },
            { type: 'DATE_MAIN', label: 'Main Dates (Grid)' },
            { type: 'WEEK_NUMBER', label: 'Week Numbers' },
            { type: 'YEAR_LABEL', label: 'Year' },
            { type: 'MINI_CALENDAR_NEXT_MONTH', label: 'Next Month Mini Calendar' }
        ],
        weekly: [
            { type: 'NAVIGATION_TABS', label: 'Navigation Tabs' },
            { type: 'WEEK_LABEL', label: 'Week Label' },
            { type: 'WEEK_DATE', label: 'Week Dates' },
            { type: 'MONTH_LABEL', label: 'Month Label' },
            { type: 'MINI_CALENDAR_CURRENT_MONTH', label: 'Current Month Mini Calendar' }
        ],
        daily: [
            { type: 'NAVIGATION_TABS', label: 'Navigation Tabs' },
            { type: 'DAILY_DATE', label: 'Date Header' },
            { type: 'DAILY_DAY', label: 'Day Name' },
            { type: 'WEEK_NUMBER', label: 'Week Number' },
            { type: 'DAILY_QUOTE', label: 'Quote' },
            { type: 'DAILY_HOLIDAY', label: 'Holiday Label (Pill)' },
            { type: 'MINI_CALENDAR_CURRENT_MONTH', label: 'Current Month Mini Calendar' }
        ],
        global: [
            { type: 'NAVIGATION_TABS', label: 'Navigation Tabs (Global)' },
            { type: 'LINK_RECT', label: 'Invisible Link' },
            { type: 'CUSTOM_TEXT', label: 'Global Text/Label' }
        ],
        subpages: []
    };

    const addPlaceholder = (type: string, label: string) => {
        if (!files[activeTab] && activeTab !== 'mini' && activeTab !== 'global' && activeTab !== 'subpages') {
            alert('Please upload a PDF template first.');
            return;
        }

        // Default configs based on type
        let gridConfig = undefined;
        let fontSize = 12;

        if (type === 'NAVIGATION_TABS') {
            gridConfig = { cols: 1, rows: 12, width: 78, height: 77.08, paddingX: 0, paddingY: 0 };
            fontSize = 10;
        } else if (type === 'DATE_MAIN') {
            gridConfig = { cols: 7, rows: 6, width: 20, height: 20, paddingX: 5, paddingY: 5 };
            fontSize = 16;
        } else if (type === 'MINI_CAL_GRID') {
            gridConfig = { cols: 7, rows: 6, width: 10, height: 10, paddingX: 1, paddingY: 1 };
            fontSize = 8;
        } else if (type === 'MINI_CAL_TITLE') {
            // Default to dynamic name short
            if (label === 'Month Title') label = '%month_short%';
            fontSize = 8;
        } else if (type === 'MINI_CAL_HEADER') {
            gridConfig = { cols: 7, rows: 1, width: 10, height: 10, paddingX: 1, paddingY: 0 };
            fontSize = 8;
        } else if (type === 'MINI_CALENDAR_INSTANCE') {
            // Default to month 1
            if (label === 'Mini Calendar') label = '1';
        } else if (type === 'MINI_CALENDAR_NEXT_MONTH') {
            if (label === 'Next Month Mini Calendar') label = 'Next Month';
        } else if (type === 'MINI_CALENDAR_CURRENT_MONTH') {
            if (label === 'Current Month Mini Calendar') label = 'Current Month';
        } else if (type === 'YEARLY_MONTH_GRID') {
            // Small grid for yearly view
            gridConfig = { cols: 7, rows: 6, width: 10, height: 10, paddingX: 1, paddingY: 1 };
            fontSize = 8;
            // Default label to "1" (January) if generic
            if (label === 'Month Grid') label = '1';
        } else if (type === 'VERTICAL_MONTH_GRID') {
            // 2 Columns (Date, Day) x 31 Rows
            gridConfig = { cols: 2, rows: 31, width: 15, height: 15, paddingX: 0, paddingY: 0 };
            fontSize = 8;
            if (label === 'Vertical Grid (Date/Day)') label = '1';
        } else if (type === 'MONTH_NAME') {
            // 6 columns for months (Jan-Jun or Jul-Dec), 1 row
            gridConfig = { cols: 6, rows: 1, width: 80, height: 20, paddingX: 5, paddingY: 0 };
            fontSize = 12;
            if (label === 'Month Names (1x6 Grid)') label = '1'; // Start with Jan-Jun
        } else if (type === 'WEEK_NUMBER' && activeTab === 'monthly') {
            gridConfig = { cols: 1, rows: 6, width: 30, height: 20, paddingX: 2, paddingY: 2 };
            fontSize = 12;
        } else if (type === 'WEEK_DATE') {
            gridConfig = { cols: 7, rows: 1, width: 30, height: 20, paddingX: 5, paddingY: 0 };
            fontSize = 14;
        } else if (['MONTH_LABEL', 'DAILY_DAY', 'WEEK_LABEL', 'YEAR_LABEL'].includes(type)) {
            fontSize = 24;
        } else if (type === 'DAILY_HOLIDAY') {
            // Pill-shaped holiday label
            gridConfig = { cols: 1, rows: 1, width: 150, height: 20, paddingX: 0, paddingY: 0 };
            fontSize = 10;
        } else if (type === 'WEEK_HOLIDAY') {
            // Holiday labels grid for weekly page (7 columns for each day)
            gridConfig = { cols: 7, rows: 1, width: 50, height: 16, paddingX: 5, paddingY: 0 };
            fontSize = 8;
        } else if (type === 'LINK_RECT') {
            gridConfig = { cols: 1, rows: 1, width: 50, height: 20, paddingX: 0, paddingY: 0 };
            // Use grid prop to store size? 'width' and 'height' in gridConfig are cell size.
            // If 1x1, it works as Rect size.
            fontSize = 0;
        }

        const newPlaceholder: PlaceholderConfig = {
            id: crypto.randomUUID(),
            type,
            label,
            x: 50,
            y: 50,
            style: {
                font: 'Roboto-Regular',
                fontSize,
                textTransform: 'none',
                align: (type === 'YEAR_LABEL' || type === 'DAILY_HOLIDAY') ? 'center' : 'left',
                color: '#000000'
            },
            grid: gridConfig
        };

        setPlaceholders(prev => ({
            ...prev,
            [activeTab]: [...prev[activeTab], newPlaceholder]
        }));
        setSelectedId(newPlaceholder.id);
    };

    const addCustomPlaceholder = () => {
        if (!customName.trim()) {
            alert('Please enter a name for the element');
            return;
        }
        if (!files[activeTab] && activeTab !== 'mini' && activeTab !== 'global') {
            alert('Please upload a PDF template first.');
            return;
        }

        let gridConfig = undefined;
        let fontSize = 12;

        if (customType === 'grid') {
            gridConfig = { cols: 4, rows: 4, width: 30, height: 20, paddingX: 2, paddingY: 2 };
        } else {
            fontSize = 24; // Default for text
        }

        const newPlaceholder: PlaceholderConfig = {
            id: Date.now().toString(),
            type: customType === 'text' ? 'CUSTOM_TEXT' : 'CUSTOM_GRID',
            label: customName,
            x: 50,
            y: 50,
            style: {
                font: 'Roboto-Regular',
                fontSize,
                textTransform: 'none',
                align: 'left',
                letterSpacing: 0
            },
            grid: gridConfig
        };

        setPlaceholders(prev => ({
            ...prev,
            [activeTab]: [...prev[activeTab], newPlaceholder]
        }));
        setSelectedId(newPlaceholder.id);
        setCustomName(''); // Reset input
    };

    const updatePlaceholderPosition = (id: string, data: DraggableData) => {
        setPlaceholders(prev => ({
            ...prev,
            [activeTab]: prev[activeTab].map(p => p.id === id ? { ...p, x: data.x, y: data.y } : p)
        }));
    };

    const updatePlaceholder = (id: string, updates: Partial<PlaceholderConfig>) => {
        setPlaceholders(prev => ({
            ...prev,
            [activeTab]: prev[activeTab].map(p => p.id === id ? { ...p, ...updates } : p)
        }));
    };

    const removePlaceholder = (id: string) => {
        setPlaceholders(prev => ({
            ...prev,
            [activeTab]: prev[activeTab].filter(p => p.id !== id)
        }));
        if (selectedId === id) setSelectedId(null);
    };

    const generatePlanner = async (scope: 'full' | 'year' | 'overview' | 'monthly' | 'weekly' | 'daily' = 'full', limit?: number) => {
        try {
            const response = await fetch('/api/generate-custom-planner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    year,
                    startDay, // Dynamic
                    config: placeholders,
                    extras, // Add sub-page config
                    scope,
                    limit,
                    // Holiday settings
                    holidaySettings: holidayCountry ? {
                        countryCode: holidayCountry,
                        showPublic: holidayShowPublic,
                        showBank: holidayShowBank,
                        showObservance: holidayShowObservance,
                        displayStyle: holidayDisplayStyle
                    } : undefined
                }),
            });
            if (!response.ok) throw new Error('Generation failed');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const startDayShort = startDay === 'Monday' ? 'Mon' : 'Sun';
            const holidayCode = holidayCountry || 'NoHoliday';
            a.download = `planner_${year}_${startDayShort}_${holidayCode}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Generation error:', error);
            alert('Failed to generate planner');
        }
    };

    const saveConfig = async () => {
        try {
            const config = {
                plannerType,
                placeholders,
                extras,
                activeTab,
                year,
                startDay,
                holidaySettings: holidayCountry ? {
                    countryCode: holidayCountry,
                    showPublic: holidayShowPublic,
                    showBank: holidayShowBank,
                    showObservance: holidayShowObservance,
                    displayStyle: holidayDisplayStyle
                } : undefined
            };
            const res = await fetch(`/api/save-config?type=${plannerType}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            if (res.ok) alert('Configuration Saved!');
        } catch (e) {
            console.error('Save failed', e);
        }
    };

    // NEW DATA FUNCTIONS
    const handleBackup = async () => {
        try {
            const res = await fetch('/api/backup', { method: 'POST' });
            if (res.ok) {
                alert('Backup created successfully!');
            } else {
                alert('Backup failed check server logs.');
            }
        } catch (e) {
            console.error('Backup error', e);
            alert('Backup error');
        }
    };

    const handleSaveAs = () => {
        const config = { placeholders, extras, activeTab, year, startDay };
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `planner_config_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const hiddenFileInput = useRef<HTMLInputElement>(null);

    const handleLoadClick = () => {
        hiddenFileInput.current?.click();
    };

    const handleLoadFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                if (json.placeholders) {
                    setPlaceholders({
                        yearly: [],
                        monthly: [],
                        weekly: [],
                        daily: [],
                        mini: [],
                        global: [],
                        subpages: [],
                        ...json.placeholders
                    });
                }
                if (json.year) setYear(json.year);
                if (json.startDay) setStartDay(json.startDay);
                if (json.activeTab) setActiveTab(json.activeTab);
                if (json.extras) setExtras(json.extras);
                alert('Configuration loaded!');
            } catch (err) {
                console.error('Invalid JSON', err);
                alert('Failed to load configuration: Invalid JSON');
            }
        };
        reader.readAsText(file);
        // Reset value so same file can be selected again
        event.target.value = '';
    };

    // Render Preview Helpers
    const renderPlaceholder = (ph: PlaceholderConfig) => {
        const style: React.CSSProperties = {
            fontFamily: ph.style?.font?.includes('Bold') ? 'Roboto, sans-serif' : (ph.style?.font?.includes('Light') ? 'Roboto, sans-serif' : (ph.style?.font?.includes('Thin') ? 'Roboto, sans-serif' : 'Roboto, sans-serif')),
            fontWeight: ph.style?.font?.includes('Bold') ? 700 : (ph.style?.font?.includes('Light') ? 300 : (ph.style?.font?.includes('Thin') ? 100 : 400)),
            fontSize: `${ph.style?.fontSize || 12}px`,
            textTransform: ph.style?.textTransform || 'none',
            whiteSpace: 'nowrap',
            lineHeight: 1,
            pointerEvents: 'none',
            letterSpacing: ph.style?.letterSpacing ? `${ph.style?.letterSpacing}px` : 'normal',
            color: ph.style?.color || 'black'
        };

        // NAVIGATION TABS PREVIEW
        if (ph.type === 'NAVIGATION_TABS') {
            const tabs = [];
            const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const w = ph.grid?.width || 30;
            const h = ph.grid?.height || 20;
            const px = ph.grid?.paddingX || 0;
            const py = ph.grid?.paddingY || 5;

            // Simple stacking for preview
            for (let i = 0; i < 12; i++) {
                const cols = ph.grid?.cols || 1;
                const row = Math.floor(i / cols);
                const col = i % cols;

                // Overlap by 0.5px
                const xPos = col * (w + px - 0.5);
                const yPos = row * (h + py - 0.5);

                tabs.push(
                    <div key={i} style={{
                        position: 'absolute',
                        left: xPos,
                        top: yPos,
                        width: w,
                        height: h,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: i === 0 ? '#333' : 'transparent', // Transparent for inactive
                        color: i === 0 ? '#fff' : '#000',
                        fontSize: style.fontSize,
                        fontFamily: style.fontFamily,
                        border: 'none'
                    }}>
                        <span style={{
                            transform: 'rotate(-90deg)',
                            fontFamily: 'Roboto-Regular', // Force regular as requested
                            textTransform: 'uppercase'
                        }}>
                            {labels[i].substring(0, 3)}
                        </span>
                    </div>
                );
            }
            // Bounding box
            const numRows = Math.ceil(12 / (ph.grid?.cols || 1));
            const numCols = Math.min(12, ph.grid?.cols || 1);
            const totalW = numCols * w + (numCols - 1) * px;
            const totalH = numRows * h + (numRows - 1) * py;
            return <div className="relative" style={{ width: totalW, height: totalH }}>{tabs}</div>;
        }

        // DATE GRID PREVIEW
        if (ph.type === 'DATE_MAIN') {
            const cells = [];
            const w = ph.grid?.width || 20;
            const h = ph.grid?.height || 20;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const px = ph.grid?.paddingX || 2;
            const py = ph.grid?.paddingY || 2;
            const gapX = ph.grid?.paddingX || 2;
            const gapY = ph.grid?.paddingY || 2;

            for (let i = 0; i < 37; i++) {
                const r = Math.floor(i / 7);
                const c = i % 7;
                cells.push(
                    <div key={i} style={{
                        position: 'absolute',
                        left: c * (w + gapX),
                        top: r * (h + gapY),
                        width: w, height: h,
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', // Right align
                        paddingRight: '4px', // Padding for right align
                        ...style
                    }}>
                        {i + 1}
                    </div>
                );
            }
            return <div className="relative" style={{ width: 7 * (w + gapX), height: 5 * (h + gapY) }}>{cells}</div>;
        }

        // WEEK DATE PREVIEW
        if (ph.type === 'WEEK_DATE') {
            const cells = [];
            const w = ph.grid?.width || 30;
            const gapX = ph.grid?.paddingX || 5;

            for (let i = 0; i < 7; i++) {
                cells.push(
                    <div key={i} style={{
                        position: 'absolute',
                        left: i * (w + gapX),
                        top: 0,
                        width: w,
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        color: 'black',
                        ...style
                    }}>
                        {10 + i}
                    </div>
                );
            }
            return <div className="relative" style={{ width: 7 * (w + gapX), height: 20 }}>{cells}</div>;
        }

        // WEEK NUMBER PREVIEW (Grid)
        if (ph.type === 'WEEK_NUMBER' && ph.grid) {
            const cells = [];
            const w = ph.grid?.width || 30;
            const h = ph.grid?.height || 20;
            const gapX = ph.grid?.paddingX || 2;
            const gapY = ph.grid?.paddingY || 2;
            const cols = ph.grid.cols || 1;
            const rows = ph.grid.rows || 6;

            for (let i = 0; i < (cols * rows); i++) {
                const r = Math.floor(i / cols);
                const c = i % cols;

                cells.push(
                    <div key={i} style={{
                        position: 'absolute',
                        left: c * (w + gapX),
                        top: r * (h + gapY),
                        width: w,
                        height: h || 20,
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        pointerEvents: 'none'
                    }}>
                        <div style={{
                            width: '15px', height: '15px',
                            backgroundColor: 'rgba(0,0,0,0.4)', // 40% black
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            ...style,
                            color: 'white',
                            lineHeight: 1
                        }}>
                            {i + 1}
                        </div>
                    </div>
                );
            }
            return <div className="relative" style={{ width: cols * (w + gapX), height: rows * (h + gapY) }}>{cells}</div>;
        }

        // CUSTOM TEXT PREVIEW
        if (ph.type === 'CUSTOM_TEXT') {
            if (ph.grid) {
                // Grid Mode Preview
                const tokens = ph.label.trim().split(/\s+/);
                const cells = [];
                const w = ph.grid.width;
                const h = ph.grid.height;
                const gapX = ph.grid.paddingX;
                const gapY = ph.grid.paddingY;
                const cols = ph.grid.cols;
                const rows = ph.grid.rows;
                const count = Math.min(tokens.length, cols * rows);

                for (let i = 0; i < count; i++) {
                    const r = Math.floor(i / cols);
                    const c = i % cols;

                    cells.push(
                        <div key={i} style={{
                            position: 'absolute',
                            left: c * (w + gapX),
                            top: r * (h + gapY),
                            width: w,
                            height: h,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            ...style,
                            whiteSpace: 'nowrap'
                        }}>
                            {tokens[i]}
                        </div>
                    );
                }
                return <div className="relative" style={{ width: cols * (w + gapX), height: rows * (h + gapY) }}>{cells}</div>;
            } else {
                return <div style={style}>{ph.label}</div>;
            }
        }

        // CUSTOM GRID PREVIEW
        if (ph.type === 'CUSTOM_GRID' && ph.grid) {
            const cells = [];
            const w = ph.grid.width;
            const h = ph.grid.height;
            const gapX = ph.grid.paddingX;
            const gapY = ph.grid.paddingY;
            const cols = ph.grid.cols;
            const rows = ph.grid.rows;

            for (let i = 0; i < (cols * rows); i++) {
                const r = Math.floor(i / cols);
                const c = i % cols;

                cells.push(
                    <div key={i} style={{
                        position: 'absolute',
                        left: c * (w + gapX),
                        top: r * (h + gapY),
                        width: w,
                        height: h,
                        border: '0.5px solid rgba(0,0,0,0.3)',
                        pointerEvents: 'none'
                    }} />
                );
            }
            return <div className="relative" style={{ width: cols * (w + gapX), height: rows * (h + gapY) }}>{cells}</div>;
        }

        // YEARLY MONTH GRID PREVIEW
        if (ph.type === 'YEARLY_MONTH_GRID' && ph.grid) {
            const cells = [];
            const w = ph.grid.width;
            const h = ph.grid.height;
            const gapX = ph.grid.paddingX;
            const gapY = ph.grid.paddingY;
            const cols = ph.grid.cols || 7;
            const rows = ph.grid.rows || 6;

            // Just render 1-31 or similar to show density
            // It's a 7x6 grid
            for (let i = 0; i < 42; i++) {
                const r = Math.floor(i / 7);
                const c = i % 7;

                // Show only first 31?
                const text = i < 31 ? (i + 1).toString() : '';

                cells.push(
                    <div key={i} style={{
                        position: 'absolute',
                        left: c * (w + gapX),
                        top: r * (h + gapY),
                        width: w, height: h,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: `${ph.style?.fontSize || 8}px`,
                        color: typeof ph.label === 'string' && ph.label === '1' ? 'black' : 'rgba(0,0,0,0.5)', // Just a visual hint
                        ...style
                    }}>
                        {text}
                    </div>
                );
            }
            return <div className="relative" style={{ width: cols * (w + gapX), height: rows * (h + gapY) }}>
                {/* Optional Label overlay? */}
                <div className="absolute -top-4 left-0 w-full text-center text-[8px] uppercase tracking-wider opacity-50">
                    Month {ph.label}
                </div>
                {cells}
            </div>;
        }

        // VERTICAL_MONTH_GRID PREVIEW
        if (ph.type === 'VERTICAL_MONTH_GRID' && ph.grid) {
            const cells = [];
            const w = ph.grid.width;
            const h = ph.grid.height;
            const gapX = ph.grid.paddingX;
            const gapY = ph.grid.paddingY;
            const rows = ph.grid.rows;

            // Render mock rows
            for (let i = 0; i < rows; i++) {
                const r = i;
                // Column 0: Date (1-31)
                const date = i + 1;
                // Mock days: start Mon (0)
                const dayIndex = i % 7;
                const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
                const dayLabel = days[dayIndex];

                // Styles
                const isSat = dayIndex === 5;
                const isSun = dayIndex === 6;

                // Col 0 Cell (Date)
                const bg = isSat ? '#ccc' : (isSun ? '#000' : 'transparent');
                const fg = isSat ? '#fff' : (isSun ? '#fff' : '#000');

                cells.push(
                    <div key={`d-${i}`} style={{
                        position: 'absolute',
                        left: 0,
                        top: r * (h + gapY),
                        width: w, height: h,
                        backgroundColor: bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: `${ph.style?.fontSize || 8}px`,
                        ...style,
                        color: fg // override style color
                    }}>
                        {date}
                    </div>
                );

                // Col 1 Cell (Day)
                cells.push(
                    <div key={`dy-${i}`} style={{
                        position: 'absolute',
                        left: w + gapX,
                        top: r * (h + gapY),
                        width: w, height: h,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: `${ph.style?.fontSize || 8}px`,
                        ...style
                    }}>
                        {dayLabel}
                    </div>
                );
            }
            return <div className="relative" style={{ width: 2 * (w + gapX), height: rows * (h + gapY) }}>
                <div className="absolute -top-4 left-0 w-full text-center text-[8px] uppercase tracking-wider opacity-50">
                    Month {ph.label}
                </div>
                {cells}
            </div>;
        }

        // MINI_CAL_HEADER PREVIEW
        if (ph.type === 'MINI_CAL_HEADER') {
            const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']; // Assume Mon start
            const cells = [];
            const w = ph.grid?.width || 10;
            const gapX = ph.grid?.paddingX || 0;

            for (let i = 0; i < 7; i++) {
                const isBold = i === 6; // Sunday bold
                cells.push(
                    <div key={i} style={{
                        position: 'absolute',
                        left: i * (w + gapX),
                        top: 0,
                        width: w,
                        display: 'flex', justifyContent: 'center',
                        fontWeight: isBold ? 'bold' : 'normal',
                        ...style
                    }}>
                        {labels[i]}
                    </div>
                );
            }
            return <div className="relative" style={{ width: 7 * (w + gapX), height: 10 }}>{cells}</div>;
        }

        // MINI_CAL_GRID PREVIEW (Similar to YEARLY_MONTH_GRID)
        if (ph.type === 'MINI_CAL_GRID') {
            const cells = [];
            const w = ph.grid?.width || 10;
            const h = ph.grid?.height || 10;
            const gapX = ph.grid?.paddingX || 0;
            const gapY = ph.grid?.paddingY || 0;

            for (let i = 0; i < 35; i++) { // 5 rows
                const r = Math.floor(i / 7);
                const c = i % 7;
                const text = (i + 1).toString();
                const isBold = c === 6; // Sunday bold

                cells.push(
                    <div key={i} style={{
                        position: 'absolute',
                        left: c * (w + gapX),
                        top: r * (h + gapY),
                        width: w, height: h,
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        fontWeight: isBold ? 'bold' : 'normal',
                        ...style
                    }}>
                        {i < 31 ? text : ''}
                    </div>
                );
            }
            return <div className="relative" style={{ width: 7 * (w + gapX), height: 5 * (h + gapY) }}>{cells}</div>;
        }

        // MINI_CALENDAR_INSTANCE PREVIEW (Recursive/Composite)
        if (ph.type === 'MINI_CALENDAR_INSTANCE') {
            // Render the "mini" config here, offset by 0,0
            // We can't easily recurse renderPlaceholder because it uses absolute positioning logic 
            // that might conflict with how we want to show it here (relative)
            // But we can try just rendering them in a container.
            const blueprint = placeholders.mini;

            if (!blueprint || blueprint.length === 0) {
                return <div className="border border-dashed border-slate-400 p-2 text-[10px] text-slate-500 bg-white/50">Empty Mini Cal</div>;
            }

            return (
                <div className="relative pointer-events-none">
                    {blueprint.map((item, idx) => (
                        <div key={idx} style={{ position: 'absolute', left: item.x, top: item.y }}>
                            {renderPlaceholder({ ...item, x: 0, y: 0 })}
                        </div>
                    ))}
                    {/* Bounding box visual */}
                    <div className="absolute inset-0 border border-indigo-400/30"></div>
                </div>
            );
        }

        // LINK_RECT PREVIEW
        if (ph.type === 'LINK_RECT' && ph.grid) {
            const w = ph.grid.width;
            const h = ph.grid.height;
            return (
                <div style={{
                    width: w,
                    height: h,
                    border: '1px dashed rgba(255,0,0,0.5)',
                    backgroundColor: 'rgba(255,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '8px',
                    color: 'red',
                    pointerEvents: 'none'
                }}>
                    LINK
                </div>
            );
        }

        return <div style={style}>{ph.label}</div>;
    };

    // Restore config on load
    useEffect(() => {
        async function init() {
            try {
                const res = await fetch(`/api/load-config?type=${plannerType}`);
                if (res.ok) {
                    const config = await res.json();
                    if (config.placeholders) {
                        setPlaceholders({
                            yearly: [],
                            overview: [],
                            monthly: [],
                            weekly: [],
                            daily: [],
                            mini: [],
                            global: [],
                            subpages: [],
                            ...config.placeholders
                        });
                    }
                    if (config.extras) setExtras(config.extras);
                    if (config.year) setYear(config.year);
                    if (config.startDay) setStartDay(config.startDay);
                }
            } catch (e) { console.error('Init failed', e); }

            // Always try to load custom templates (regardless of config)
            ['yearly', 'overview', 'monthly', 'weekly', 'daily', 'global', 'grid', 'dot', 'line', 'blank'].forEach(async (type) => {
                try {
                    const customRes = await fetch(`/templates/custom/${type}_template.pdf`);
                    if (customRes.ok) {
                        const blob = await customRes.blob();
                        const file = new File([blob], `${type}_template.pdf`, { type: 'application/pdf' });
                        setFiles(prev => ({ ...prev, [type]: file }));
                    }
                } catch (e) {
                    // Template doesn't exist, that's fine
                }
            });
        }
        init();
    }, [plannerType]); // Re-run when plannerType changes


    // Keyboard Delete Handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
                // Ignore if typing in input
                if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

                removePlaceholder(selectedId);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, activeTab, placeholders]);

    const selectedPlaceholder = selectedId && placeholders[activeTab] && placeholders[activeTab].find(p => p.id === selectedId);

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            <Head>
                <title>Planner Builder | GoodPlanr</title>
                <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap" rel="stylesheet" />
            </Head>

            {/* SIDEBAR */}
            <aside className="w-80 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-20">
                <div className="p-6 border-b border-slate-800 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold text-white tracking-tight">Builder</h1>
                        <div className="flex gap-2">
                            <button onClick={handleBackup} className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1 rounded" title="Backup Project">Backup</button>
                            <button onClick={saveConfig} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded">Save</button>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleSaveAs} className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 px-3 py-2 rounded">Save As JSON</button>
                        <button onClick={handleLoadClick} className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 px-3 py-2 rounded">Load JSON</button>
                        <input
                            type="file"
                            ref={hiddenFileInput}
                            onChange={handleLoadFileChange}
                            accept="application/json"
                            className="hidden"
                        />
                    </div>
                    {/* Planner Type Selector */}
                    <div className="mt-3">
                        <label className="text-xs text-slate-500 block mb-1">Planner Type</label>
                        <div className="flex gap-1">
                            {(['classic', 'veho', 'vertical'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setPlannerType(type)}
                                    className={`flex-1 px-3 py-2 text-sm font-medium rounded capitalize transition-colors ${plannerType === type
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-b border-slate-800">
                    {/* Row 1: System Tabs */}
                    <div className="flex gap-1 mb-2">
                        <button
                            className={`flex-1 px-3 py-2 text-sm font-semibold rounded-t ${activeTab === 'mini' ? 'bg-slate-700 text-indigo-400' : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-800'}`}
                            onClick={() => setActiveTab('mini')}
                            title="Mini Calendar Blueprint"
                        >
                            Mini
                        </button>
                        <button
                            className={`flex-1 px-3 py-2 text-sm font-semibold rounded-t ${activeTab === 'global' ? 'bg-slate-700 text-indigo-400' : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-800'}`}
                            onClick={() => setActiveTab('global')}
                            title="Master Page (Global Elements)"
                        >
                            Master
                        </button>
                        <button
                            className={`flex-1 px-3 py-2 text-sm font-semibold rounded-t ${activeTab === 'subpages' ? 'bg-slate-700 text-indigo-400' : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-800'}`}
                            onClick={() => setActiveTab('subpages')}
                            title="Sub Pages (Extras)"
                        >
                            Sub
                        </button>
                    </div>
                    {/* Row 2: Page Tabs */}
                    <div className="flex gap-1 border-b border-slate-700 pb-2">
                        <button
                            className={`flex-1 px-2 py-2 text-sm font-semibold ${activeTab === 'yearly' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-indigo-300'}`}
                            onClick={() => setActiveTab('yearly')}
                            title="Yearly Page"
                        >
                            Year
                        </button>
                        <button
                            className={`flex-1 px-2 py-2 text-sm font-semibold ${activeTab === 'overview' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-indigo-300'}`}
                            onClick={() => setActiveTab('overview')}
                            title="Overview Page"
                        >
                            Overview
                        </button>
                        <button
                            className={`flex-1 px-2 py-2 text-sm font-semibold ${activeTab === 'monthly' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-indigo-300'}`}
                            onClick={() => setActiveTab('monthly')}
                            title="Monthly Page"
                        >
                            Month
                        </button>
                        <button
                            className={`flex-1 px-2 py-2 text-sm font-semibold ${activeTab === 'weekly' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-indigo-300'}`}
                            onClick={() => setActiveTab('weekly')}
                            title="Weekly Page"
                        >
                            Week
                        </button>
                        <button
                            className={`flex-1 px-2 py-2 text-sm font-semibold ${activeTab === 'daily' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-indigo-300'}`}
                            onClick={() => setActiveTab('daily')}
                            title="Daily Page"
                        >
                            Day
                        </button>
                    </div>
                    {/* Year Input */}
                    <div className="mt-4 flex items-center justify-between px-2">
                        <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Target Year</span>
                        <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white w-24 text-center" />
                    </div>
                    {/* Start Day Input */}
                    <div className="mt-4 flex items-center justify-between px-2">
                        <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Start Day</span>
                        <div className="flex bg-slate-800 p-1 rounded border border-slate-700">
                            <button onClick={() => setStartDay('Monday')} className={`px-3 py-1 text-xs rounded ${startDay === 'Monday' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Mon</button>
                            <button onClick={() => setStartDay('Sunday')} className={`px-3 py-1 text-xs rounded ${startDay === 'Sunday' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Sun</button>
                        </div>
                    </div>

                    {/* Holiday Settings Section */}
                    <div className="mt-4 px-2 pb-4 border-b border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs uppercase tracking-wider font-bold text-slate-400">🎄 Holidays</span>
                        </div>
                        <select
                            value={holidayCountry}
                            onChange={(e) => setHolidayCountry(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white mb-2"
                        >
                            {popularCountries.map(c => (
                                <option key={c.code} value={c.code}>{c.name}</option>
                            ))}
                        </select>

                        {holidayCountry && (
                            <div className="space-y-2 mt-2">
                                <div className="text-xs text-slate-400 mb-1">Show:</div>
                                <div className="flex flex-wrap gap-2">
                                    <label className="flex items-center gap-1 text-xs text-slate-300">
                                        <input
                                            type="checkbox"
                                            checked={holidayShowPublic}
                                            onChange={(e) => setHolidayShowPublic(e.target.checked)}
                                            className="accent-indigo-500"
                                        />
                                        Public
                                    </label>
                                    <label className="flex items-center gap-1 text-xs text-slate-300">
                                        <input
                                            type="checkbox"
                                            checked={holidayShowBank}
                                            onChange={(e) => setHolidayShowBank(e.target.checked)}
                                            className="accent-indigo-500"
                                        />
                                        Bank
                                    </label>
                                    <label className="flex items-center gap-1 text-xs text-slate-300">
                                        <input
                                            type="checkbox"
                                            checked={holidayShowObservance}
                                            onChange={(e) => setHolidayShowObservance(e.target.checked)}
                                            className="accent-indigo-500"
                                        />
                                        Observance
                                    </label>
                                </div>

                                <div className="text-xs text-slate-400 mt-2 mb-1">Display Style:</div>
                                <select
                                    value={holidayDisplayStyle}
                                    onChange={(e) => setHolidayDisplayStyle(e.target.value as any)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                >
                                    <option value="all">All (Dot + Label + Color)</option>
                                    <option value="highlight">Highlight Only (Red + Dot)</option>
                                    <option value="label">Label Only (Name below date)</option>
                                    <option value="dot">Dot Only (Red indicator)</option>
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Template Upload */}
                    <div>
                        <h3 className="text-sm uppercase tracking-wider text-slate-400 font-bold mb-3">Template</h3>
                        {!files[activeTab] && activeTab !== 'mini' && activeTab !== 'subpages' ? (
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-slate-800/50">
                                <span className="text-sm text-slate-300">Upload PDF</span>
                                <input type="file" className="hidden" accept="application/pdf" onChange={(e) => onFileChange(e, activeTab)} />
                            </label>
                        ) : (activeTab !== 'mini' && activeTab !== 'subpages' &&
                            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                                <span className="text-sm text-slate-200 truncate">{files[activeTab]?.name}</span>
                                <button onClick={() => setFiles(prev => ({ ...prev, [activeTab]: null }))} className="text-red-400 hover:text-red-300">×</button>
                            </div>
                        )}
                        {(activeTab === 'mini' || activeTab === 'subpages') && (
                            <p className="text-xs text-slate-400 italic">No template needed for this section.</p>
                        )}
                    </div>

                    {/* SUB PAGE CONFIGURATION - Only show for 'subpages' */}
                    {activeTab === 'subpages' && (
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-4">
                            <h3 className="text-sm uppercase tracking-wider text-slate-400 font-bold mb-3">Extra Pages Config</h3>
                            {(['grid', 'dot', 'line', 'blank'] as const).map(type => (
                                <div key={type} className="border-b border-slate-700 pb-3 last:border-0">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-slate-200 capitalize">{type} Pages</span>
                                        <span className="text-xs text-indigo-400 font-bold">{extras[type].count}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="50"
                                        value={extras[type].count}
                                        onChange={(e) => setExtras(prev => ({ ...prev, [type]: { ...prev[type], count: parseInt(e.target.value) } }))}
                                        className="w-full mb-2 accent-indigo-500"
                                    />
                                    {/* Template Upload for Extra */}
                                    <div className="text-right">
                                        <label className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer">
                                            {files[type] ? 'Replace Template' : 'Upload Template'}
                                            <input
                                                type="file"
                                                accept="application/pdf"
                                                className="hidden"
                                                onChange={(e) => onFileChange(e, type)}
                                            />
                                        </label>
                                        {files[type] && <span className="text-xs text-slate-500 ml-2">({files[type]?.name})</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* LAYERS / ACTIVE ELEMENTS */}
                    {/* LAYERS / ACTIVE ELEMENTS */}
                    {activeTab !== 'subpages' && (
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 max-h-60 overflow-y-auto">
                            <h3 className="text-sm uppercase tracking-wider text-slate-400 font-bold mb-3">Layers</h3>
                            {placeholders[activeTab] && placeholders[activeTab].length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No elements added.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {placeholders[activeTab] && placeholders[activeTab].map((ph) => (
                                        <li
                                            key={ph.id}
                                            onClick={() => setSelectedId(ph.id)}
                                            className={`flex items-center justify-between text-sm px-3 py-2 rounded cursor-pointer group ${selectedId === ph.id ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                                        >
                                            <span className="truncate flex-1">
                                                {ph.label ? ph.label : ph.type.replace('_', ' ')}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removePlaceholder(ph.id);
                                                }}
                                                className="ml-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                ×
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {/* PROPERTIES PANEL */}
                    {activeTab !== 'subpages' && selectedPlaceholder && (
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-5">
                            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                                <span className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Properties</span>
                                <span className="text-xs text-slate-400">{selectedPlaceholder.type}</span>
                            </div>

                            {/* Label Editor for Custom Text */}
                            {(selectedPlaceholder.type === 'CUSTOM_TEXT' || selectedPlaceholder.type === 'LINK_RECT') && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <label className="text-xs text-slate-400">Label (content or token)</label>
                                        <select
                                            className="bg-slate-900 border border-slate-600 rounded text-xs text-slate-300 px-2 py-1"
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    const newVal = selectedPlaceholder.label + e.target.value;
                                                    updatePlaceholder(selectedId!, { label: newVal });
                                                    e.target.value = ''; // Reset
                                                }
                                            }}
                                        >
                                            <option value="">Insert Token...</option>
                                            <option value="%year%">Year</option>
                                            <option value="%month_name%">Month Name</option>
                                            <option value="%month_short%">Month Short (Jan)</option>
                                            <option value="%month_number%">Month Number</option>
                                            <option value="%week_number%">Week Number</option>
                                            <option value="%day_name%">Day Name</option>
                                            <option value="%day_number%">Day Number</option>
                                            <option value="%week_header_full%">Week Header (Full)</option>
                                            <option value="%week_header_short%">Week Header (Short)</option>
                                        </select>
                                    </div>
                                    <input
                                        type="text"
                                        value={selectedPlaceholder.label}
                                        onChange={(e) => updatePlaceholder(selectedId!, { label: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
                                    />

                                    {/* Layout Toggle */}
                                    {selectedPlaceholder.type === 'CUSTOM_TEXT' && (
                                        <div className="flex bg-slate-800 rounded border border-slate-700 p-1 mt-3">
                                            <button
                                                onClick={() => updatePlaceholder(selectedId!, { grid: undefined })}
                                                className={`flex-1 py-1.5 text-xs rounded ${!selectedPlaceholder.grid ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                                            >Single Line</button>
                                            <button
                                                onClick={() => updatePlaceholder(selectedId!, {
                                                    grid: { cols: 7, rows: 1, width: 30, height: 20, paddingX: 2, paddingY: 0 }
                                                })}
                                                className={`flex-1 py-1.5 text-xs rounded ${selectedPlaceholder.grid ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                                            >Grid</button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Label Editor for Generic Tokens or Month Grid */}
                            {(selectedPlaceholder.type === 'YEARLY_MONTH_GRID' || selectedPlaceholder.type === 'MINI_CALENDAR_INSTANCE' || selectedPlaceholder.type === 'VERTICAL_MONTH_GRID') && (
                                <div className="space-y-2">
                                    <label className="text-xs text-slate-400">Month Number (1-12)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="12"
                                        value={selectedPlaceholder.label}
                                        onChange={(e) => updatePlaceholder(selectedId!, { label: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
                                    />
                                </div>
                            )}

                            {/* Label Editor for MINI_CAL_TITLE */}
                            {selectedPlaceholder.type === 'MINI_CAL_TITLE' && (
                                <div className="space-y-2">
                                    <label className="text-xs text-slate-400">Title Pattern</label>
                                    <div className="flex flex-col gap-2">
                                        <select
                                            className="bg-slate-900 border border-slate-600 rounded text-xs text-slate-300 px-2 py-1"
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    updatePlaceholder(selectedId!, { label: e.target.value });
                                                }
                                            }}
                                            value={selectedPlaceholder.label}
                                        >
                                            <option value="%month_short%">Jan (Short)</option>
                                            <option value="%month_name%">January (Full)</option>
                                            <option value="%month_number%">1 (Number)</option>
                                        </select>
                                        <input
                                            type="text"
                                            value={selectedPlaceholder.label}
                                            onChange={(e) => updatePlaceholder(selectedId!, { label: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
                                            placeholder="Custom pattern..."
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Label Editor for LINK_RECT */}
                            {selectedPlaceholder.type === 'LINK_RECT' && (
                                <div className="space-y-2">
                                    <label className="text-xs text-slate-400">Link Target</label>
                                    <select
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                                        value={['yearly', 'overview', 'grid', 'dot', 'line', 'blank'].includes(selectedPlaceholder.label.toLowerCase()) ? selectedPlaceholder.label.toLowerCase() : 'custom'}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val !== 'custom') {
                                                updatePlaceholder(selectedId!, { label: val });
                                            }
                                        }}
                                    >
                                        <option value="yearly">Yearly Page</option>
                                        <option value="overview">Overview Page</option>
                                        {Object.entries(extras).map(([key, val]) => (
                                            val.count > 0 && <option key={key} value={key}>{key.charAt(0).toUpperCase() + key.slice(1)} Pages</option>
                                        ))}
                                        <option value="custom">External URL</option>
                                    </select>

                                    {(!['yearly', 'overview', 'grid', 'dot', 'line', 'blank'].includes(selectedPlaceholder.label.toLowerCase()) || selectedPlaceholder.label.toLowerCase() === 'custom') && (
                                        <input
                                            type="text"
                                            value={selectedPlaceholder.label}
                                            onChange={(e) => updatePlaceholder(selectedId!, { label: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-2"
                                            placeholder="https://..."
                                        />
                                    )}
                                </div>
                            )}

                            {/* POSITION */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400">X Position</label>
                                    <NumberInput
                                        value={selectedPlaceholder.x}
                                        onValueChange={(val) => updatePlaceholder(selectedId!, { x: val })}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400">Y Position</label>
                                    <NumberInput
                                        value={selectedPlaceholder.y}
                                        onValueChange={(val) => updatePlaceholder(selectedId!, { y: val })}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
                                    />
                                </div>
                            </div>

                            {/* Font Styling */}
                            {selectedPlaceholder.type !== 'LINK_RECT' && (
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500">Typography</label>
                                    <select
                                        value={selectedPlaceholder.style?.font}
                                        onChange={(e) => updatePlaceholder(selectedId!, { style: { ...selectedPlaceholder.style!, font: e.target.value } })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white mb-2"
                                    >
                                        <option value="Roboto-Light">Roboto Light</option>
                                        <option value="Roboto-Regular">Roboto Regular</option>
                                        <option value="Roboto-Bold">Roboto Bold</option>
                                        <option value="Roboto-Thin">Roboto Thin</option>
                                    </select>
                                    <div className="flex gap-2 items-center">
                                        <NumberInput value={selectedPlaceholder.style?.fontSize || 12} onValueChange={(val) => updatePlaceholder(selectedId!, { style: { ...selectedPlaceholder.style!, fontSize: val } })} className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" />
                                        <span className="text-[10px] text-slate-500">px</span>

                                        <button
                                            className={`ml-auto px-2 py-1 text-[10px] rounded ${selectedPlaceholder.style?.textTransform === 'uppercase' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'} `}
                                            onClick={() => updatePlaceholder(selectedId!, { style: { ...selectedPlaceholder.style!, textTransform: selectedPlaceholder.style?.textTransform === 'uppercase' ? 'none' : 'uppercase' } })}
                                        >AA</button>
                                    </div>
                                    <div className="flex gap-2 items-center mt-2">
                                        <label className="text-[10px] text-slate-500 w-16">Spacing</label>
                                        <NumberInput step={0.1} value={selectedPlaceholder.style?.letterSpacing || 0} onValueChange={(val) => updatePlaceholder(selectedId!, { style: { ...selectedPlaceholder.style!, letterSpacing: val } })} className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" />
                                        <span className="text-[10px] text-slate-500">px</span>
                                    </div>
                                    <div className="space-y-1 mt-2">
                                        <label className="text-[10px] text-slate-500">Alignment</label>
                                        <div className="flex bg-slate-900 rounded border border-slate-700 p-0.5">
                                            {['left', 'center', 'right'].map((align) => (
                                                <button
                                                    key={align}
                                                    onClick={() => updatePlaceholder(selectedId!, { style: { ...selectedPlaceholder.style!, align: align as any } })}
                                                    className={`flex-1 py-1 text-[10px] capitalize rounded ${selectedPlaceholder.style?.align === align ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'} `}
                                                >
                                                    {align}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1 mt-2">
                                        <label className="text-[10px] text-slate-500">Color</label>
                                        <input
                                            type="color"
                                            value={selectedPlaceholder.style?.color || '#000000'}
                                            onChange={(e) => updatePlaceholder(selectedId!, { style: { ...selectedPlaceholder.style!, color: e.target.value } })}
                                            className="w-full h-8 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Grid Settings */}
                            {selectedPlaceholder.grid && (
                                <div className="space-y-2 pt-2 border-t border-slate-700">
                                    <label className="text-xs text-slate-400 block">Grid Layout</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs text-slate-400">Rows</label>
                                            <NumberInput value={selectedPlaceholder.grid.rows} onValueChange={(val) => updatePlaceholder(selectedId!, { grid: { ...selectedPlaceholder.grid!, rows: val } })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400">Cols</label>
                                            <NumberInput value={selectedPlaceholder.grid.cols} onValueChange={(val) => updatePlaceholder(selectedId!, { grid: { ...selectedPlaceholder.grid!, cols: val } })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400">Cell W</label>
                                            <input type="number" step="0.5" value={selectedPlaceholder.grid.width} onChange={(e) => updatePlaceholder(selectedId!, { grid: { ...selectedPlaceholder.grid!, width: parseFloat(e.target.value) } })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400">Cell H</label>
                                            <input type="number" step="0.5" value={selectedPlaceholder.grid.height} onChange={(e) => updatePlaceholder(selectedId!, { grid: { ...selectedPlaceholder.grid!, height: parseFloat(e.target.value) } })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400">Pad X</label>
                                            <input type="number" step="0.5" value={selectedPlaceholder.grid.paddingX} onChange={(e) => updatePlaceholder(selectedId!, { grid: { ...selectedPlaceholder.grid!, paddingX: parseFloat(e.target.value) } })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400">Pad Y</label>
                                            <input type="number" step="0.5" value={selectedPlaceholder.grid.paddingY} onChange={(e) => updatePlaceholder(selectedId!, { grid: { ...selectedPlaceholder.grid!, paddingY: parseFloat(e.target.value) } })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" />
                                        </div>
                                    </div>
                                    {/* Holiday Offset Y - only for WEEK_DATE */}
                                    {selectedPlaceholder.type === 'WEEK_DATE' && (
                                        <div className="mt-2 space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-xs text-slate-400">Holiday Offset Y</label>
                                                    <input
                                                        type="number"
                                                        step="1"
                                                        value={selectedPlaceholder.grid?.holidayOffsetY || 0}
                                                        onChange={(e) => updatePlaceholder(selectedId!, { grid: { ...selectedPlaceholder.grid!, holidayOffsetY: parseFloat(e.target.value) } })}
                                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-400">Holiday Offset X</label>
                                                    <input
                                                        type="number"
                                                        step="1"
                                                        value={selectedPlaceholder.grid?.holidayOffsetX || 0}
                                                        onChange={(e) => updatePlaceholder(selectedId!, { grid: { ...selectedPlaceholder.grid!, holidayOffsetX: parseFloat(e.target.value) } })}
                                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white mt-1"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400">Holiday Font Size</label>
                                                <input
                                                    type="number"
                                                    step="1"
                                                    value={selectedPlaceholder.grid?.holidayFontSize || 7}
                                                    onChange={(e) => updatePlaceholder(selectedId!, { grid: { ...selectedPlaceholder.grid!, holidayFontSize: parseFloat(e.target.value) } })}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white mt-1"
                                                />
                                            </div>
                                            <p className="text-[9px] text-slate-500">Set Offset Y &gt; 0 to show holiday labels</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Custom Elements */}
                    <div className="mb-6 border-b border-slate-800 pb-6">
                        <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-3">Custom Elements</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] text-slate-500 block mb-1">Element Name</label>
                                <input
                                    type="text"
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    placeholder="e.g. Notes, Habit Tracker"
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 block mb-1">Type</label>
                                <div className="flex bg-slate-800 rounded border border-slate-700 p-0.5">
                                    <button
                                        onClick={() => setCustomType('text')}
                                        className={`flex-1 py-1 text-[10px] rounded transition-colors ${customType === 'text' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'} `}
                                    >Text</button>
                                    <button
                                        onClick={() => setCustomType('grid')}
                                        className={`flex-1 py-1 text-[10px] rounded transition-colors ${customType === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'} `}
                                    >Grid</button>
                                </div>
                            </div>
                            <button
                                onClick={addCustomPlaceholder}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium py-2 rounded transition-colors"
                            >
                                Add Custom Element
                            </button>
                        </div>
                    </div>

                    {/* Element list */}
                    <div>
                        <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-3">Available Elements</h3>
                        <div className="grid gap-2">
                            {availablePlaceholders[activeTab].map((ph) => (
                                <button
                                    key={ph.type}
                                    onClick={() => addPlaceholder(ph.type, ph.label)}
                                    className="flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-lg hover:border-indigo-500 hover:bg-slate-750 transition-all group"
                                >
                                    <span className="text-sm font-medium text-slate-300 group-hover:text-white">{ph.label}</span>
                                    <span className="text-indigo-500 opacity-0 group-hover:opacity-100">+</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-2">
                    <div className="grid grid-cols-4 gap-1">
                        <button onClick={() => generatePlanner('year', 1)} className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] py-2 rounded border border-slate-800 transition-colors">Test Yearly</button>
                        <button onClick={() => generatePlanner('overview', 2)} className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] py-2 rounded border border-slate-800 transition-colors">Test Overview</button>
                        <button onClick={() => generatePlanner('monthly', 1)} className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] py-2 rounded border border-slate-800 transition-colors">Test Monthly</button>
                        <button onClick={() => generatePlanner('weekly', 1)} className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] py-2 rounded border border-slate-800 transition-colors">Test Weekly</button>
                        <button onClick={() => generatePlanner('daily', 1)} className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] py-2 rounded border border-slate-800 transition-colors">Test Daily</button>
                    </div>
                    <button onClick={() => generatePlanner('full')} className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all">
                        Generate Full Planner
                    </button>
                </div>
            </aside>

            {/* MAIN AREA */}
            <main className="flex-1 overflow-auto bg-slate-100 flex justify-center p-12 relative" onClick={() => setSelectedId(null)}>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <div
                    className="relative shadow-2xl transition-transform duration-300 origin-top"
                    ref={pdfWrapperRef}
                    style={{ transform: `scale(${pdfScale})` }}
                >
                    {files[activeTab] || activeTab === 'mini' || activeTab === 'global' || activeTab === 'subpages' ? (
                        <div className="relative">
                            {activeTab === 'mini' ? (
                                <div className="bg-white shadow-sm border border-slate-300 relative" style={{ width: 300, height: 200 }}>
                                    <div className="absolute top-2 right-2 text-[10px] text-slate-400 font-mono">Mini Calendar Blueprint</div>
                                </div>
                            ) : activeTab === 'global' && !files['global'] ? (
                                <div className="bg-white shadow-sm border border-slate-300 relative" style={{ width: 1366, height: 968 }}>
                                    <div className="absolute top-2 right-2 text-[10px] text-slate-400 font-mono">Master Page (Applied to All)</div>
                                    <div className="absolute inset-0 border-2 border-dashed border-slate-200 pointer-events-none opacity-50 m-12 rounded"></div>
                                </div>
                            ) : activeTab === 'subpages' ? (
                                <div className="bg-white shadow-sm border border-slate-300 relative" style={{ width: 1366, height: 968 }}>
                                    <div className="absolute top-2 right-2 text-[10px] text-slate-400 font-mono">Sub Pages Canvas</div>
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 text-4xl font-bold text-slate-300 uppercase tracking-widest -rotate-45">
                                        Extra Pages Config
                                    </div>
                                </div>
                            ) : (
                                <Document
                                    file={files[activeTab]}
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    className="border border-slate-200 bg-white"
                                    loading={<div className="p-10 text-slate-400">Loading PDF...</div>}
                                >
                                    <Page pageNumber={1} width={1366} renderTextLayer={false} renderAnnotationLayer={false} />
                                </Document>
                            )}

                            <div className="absolute inset-0 pointer-events-none">
                                {(placeholders[activeTab] || []).map((ph) => (
                                    <DraggableItem
                                        key={ph.id}
                                        ph={ph}
                                        isSelected={selectedId === ph.id}
                                        onSelect={() => setSelectedId(ph.id)}
                                        removePlaceholder={removePlaceholder}
                                        updatePlaceholderPosition={updatePlaceholderPosition}
                                    >
                                        {renderPlaceholder(ph)}
                                    </DraggableItem>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="w-[1366px] h-[968px] bg-white flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl">
                            <p className="text-slate-400">Select a template to begin</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
