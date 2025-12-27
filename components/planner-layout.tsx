import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"

// Popular countries for holiday selection - sorted alphabetically
const holidayCountries = [
    { code: 'none', name: 'None (No holidays)' },
    { code: 'AU', name: 'Australia' },
    { code: 'AT', name: 'Austria' },
    { code: 'BE', name: 'Belgium' },
    { code: 'BR', name: 'Brazil' },
    { code: 'CA', name: 'Canada' },
    { code: 'CN', name: 'China' },
    { code: 'CZ', name: 'Czech Republic' },
    { code: 'DK', name: 'Denmark' },
    { code: 'FR', name: 'France' },
    { code: 'DE', name: 'Germany' },
    { code: 'GR', name: 'Greece' },
    { code: 'HK', name: 'Hong Kong' },
    { code: 'IN', name: 'India' },
    { code: 'ID', name: 'Indonesia' },
    { code: 'IE', name: 'Ireland' },
    { code: 'IT', name: 'Italy' },
    { code: 'JP', name: 'Japan' },
    { code: 'MX', name: 'Mexico' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'NZ', name: 'New Zealand' },
    { code: 'NO', name: 'Norway' },
    { code: 'PH', name: 'Philippines' },
    { code: 'PL', name: 'Poland' },
    { code: 'PT', name: 'Portugal' },
    { code: 'RO', name: 'Romania' },
    { code: 'SA', name: 'Saudi Arabia' },
    { code: 'SG', name: 'Singapore' },
    { code: 'KR', name: 'South Korea' },
    { code: 'ES', name: 'Spain' },
    { code: 'SE', name: 'Sweden' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'TW', name: 'Taiwan' },
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'US', name: 'United States' },
];

export function PlannerLayout() {
    // State management
    const [year] = useState("2026") // Fixed to 2026
    const [startDay, setStartDay] = useState("monday")
    const [holidayCountry, setHolidayCountry] = useState("US")
    const [includeCulturalDays, setIncludeCulturalDays] = useState(false)
    const [weeklyLayout, setWeeklyLayout] = useState("vertical")
    const [dailyLayout, setDailyLayout] = useState("grid")
    const [loading, setLoading] = useState(false)
    const [previewModal, setPreviewModal] = useState<string | null>(null)
    const [isPaid, setIsPaid] = useState(false)
    const [redeemCode, setRedeemCode] = useState("")

    // Get preview image based on layout selection
    const getPreviewImage = (type: 'monthly' | 'weekly' | 'daily') => {
        if (type === 'monthly') return '/previews/monthly-preview.jpg';
        if (type === 'weekly') {
            return weeklyLayout === 'flexi'
                ? '/previews/weekly-flexi-preview.jpg'
                : '/previews/weekly-vertical-preview.jpg';
        }
        if (type === 'daily') {
            return dailyLayout === 'classic'
                ? '/previews/daily-classic-preview.jpg'
                : '/previews/daily-grid-preview.jpg';
        }
        return '';
    }

    // Data-fetching logic for PDF generation
    const handleGenerate = async () => {
        setLoading(true)
        try {
            // Convert startDay value to API format
            const actualStartDay = startDay === 'sunday' ? 'Sunday' : 'Monday'

            const response = await fetch('/api/generate-planner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    year,
                    startDay: actualStartDay,
                    weeklyLayout, // Pass layout choice
                    dailyLayout, // Pass layout choice
                    holidaySettings: (holidayCountry && holidayCountry !== 'none') ? {
                        countryCode: holidayCountry,
                        showPublic: true,
                        showBank: true,
                        showObservance: includeCulturalDays
                    } : undefined
                }),
            })

            if (!response.ok) throw new Error('Failed to generate PDF')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            const startDayShort = actualStartDay === 'Monday' ? 'Mon' : 'Sun'
            const holidayCode = holidayCountry || 'NoHoliday'
            a.download = `classic_planner_${year}_${startDayShort}_${holidayCode}.pdf`
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error(error)
            alert('Error generating planner')
        } finally {
            setLoading(false)
        }
    }

    const handlePurchase = () => {
        // Open Lemon Squeezy Overlay
        if (typeof window !== 'undefined' && (window as any).LemonSqueezy) {
            (window as any).LemonSqueezy.Url.Open('https://goodplanr.lemonsqueezy.com/checkout/buy/952fbb0d-c13f-457f-9d4d-811b6ed1e3e8');

            // Listen for payment success
            (window as any).LemonSqueezy.Setup({
                eventHandler: (event: any) => {
                    if (event.event === 'Checkout.Success') {
                        setIsPaid(true);
                        (window as any).LemonSqueezy.Url.Close();
                        // Auto-trigger download
                        handleGenerate();
                    }
                }
            });
        } else {
            alert('Payment system is loading... please wait a moment and try again.');
        }
    }

    const handleRedeem = () => {
        // Simple code verification - In production, verify against your database
        const code = redeemCode.toUpperCase().trim();
        if (code === 'PLAN2026' || code === 'VIP-ACCESS') {
            setIsPaid(true);
            setRedeemCode('');
        } else {
            alert('Invalid access code');
        }
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Logo and Header */}
            <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                    <Image src="/images/goodplanr-logo.png" alt="GoodPlanr Logo" width={80} height={80} className="w-auto h-20 object-contain" />
                </div>
                <h1 className="text-3xl font-normal mb-3 text-black">GoodPlanr</h1>
                <p className="text-base text-gray-700">Build professional digital planners with customizable holidays</p>
            </div>

            {/* Planner Types */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {/* Classic */}
                <div>
                    <h2 className="text-xl font-normal mb-2 text-[#8b5cf6]">Classic</h2>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        Clean, minimal design and focus on function and productivity
                    </p>
                </div>

                {/* Veho */}
                <div>
                    <div className="flex items-baseline gap-2 mb-2">
                        <h2 className="text-xl font-normal text-gray-400">Veho</h2>
                        <span className="text-xs text-gray-400">coming soon</span>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        World's only digital planner that can be use in 2 directions: vertically and horizontally at the same time.
                    </p>
                </div>

                {/* Duet */}
                <div>
                    <div className="flex items-baseline gap-2 mb-2">
                        <h2 className="text-xl font-normal text-gray-400">Duet</h2>
                        <span className="text-xs text-gray-400">coming soon</span>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        A planner system that utilise the split screen mode to boost your productivity.
                    </p>
                </div>
            </div>

            {/* Configuration Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Year */}
                <div>
                    <label className="block text-lg font-medium mb-3 text-black">Year</label>
                    <div className="w-full bg-white border border-black rounded-md h-11 px-3 flex items-center text-sm">
                        2026
                    </div>
                </div>

                {/* Week Starts On */}
                <div>
                    <label className="block text-lg font-medium mb-3 text-black">Week Starts On</label>
                    <Select value={startDay} onValueChange={setStartDay}>
                        <SelectTrigger className="w-full bg-white border-black rounded-md h-11">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="monday">Monday</SelectItem>
                            <SelectItem value="sunday">Sunday</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Holidays */}
                <div>
                    <label className="block text-lg font-medium mb-3 text-black">Holidays</label>
                    <Select value={holidayCountry} onValueChange={setHolidayCountry}>
                        <SelectTrigger className="w-full bg-white border-black rounded-md h-11">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {holidayCountries.map((c) => (
                                <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="flex items-start gap-2 mt-3">
                        <Checkbox
                            id="cultural-days"
                            checked={includeCulturalDays}
                            onCheckedChange={(checked) => setIncludeCulturalDays(checked as boolean)}
                            className="mt-0.5"
                        />
                        <label htmlFor="cultural-days" className="text-sm text-gray-700 leading-tight cursor-pointer">
                            Include Cultural Days
                            <br />
                            <span className="text-xs text-gray-600">
                                Valentine's, Mother's / Father's Day (not official holidays)
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Preview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Monthly Preview */}
                <div>
                    <div
                        className="border-2 border-gray-300 rounded bg-white overflow-hidden mb-3 cursor-pointer hover:border-gray-400 transition-colors"
                        onClick={() => setPreviewModal(getPreviewImage('monthly'))}
                    >
                        <Image
                            src={getPreviewImage('monthly')}
                            alt="Monthly Preview"
                            width={600}
                            height={800}
                            className="w-full h-auto"
                        />
                    </div>
                    <p className="text-center text-base font-normal text-black">Monthly</p>
                </div>

                {/* Weekly Preview */}
                <div>
                    <div
                        className="border-2 border-gray-300 rounded bg-white overflow-hidden mb-3 cursor-pointer hover:border-gray-400 transition-colors"
                        onClick={() => setPreviewModal(getPreviewImage('weekly'))}
                    >
                        <Image
                            src={getPreviewImage('weekly')}
                            alt="Weekly Preview"
                            width={600}
                            height={800}
                            className="w-full h-auto"
                        />
                    </div>
                    <p className="text-center text-base font-normal text-black mb-3">Weekly</p>
                    <div>
                        <label className="block text-lg font-medium mb-2 text-black">Weekly layout</label>
                        <Select value={weeklyLayout} onValueChange={setWeeklyLayout}>
                            <SelectTrigger className="w-full bg-white border-black rounded-md h-11">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="vertical">Vertical</SelectItem>
                                <SelectItem value="flexi">Flexi</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Daily Preview */}
                <div>
                    <div
                        className="border-2 border-gray-300 rounded bg-white overflow-hidden mb-3 cursor-pointer hover:border-gray-400 transition-colors"
                        onClick={() => setPreviewModal(getPreviewImage('daily'))}
                    >
                        <Image
                            src={getPreviewImage('daily')}
                            alt="Daily Preview"
                            width={600}
                            height={800}
                            className="w-full h-auto"
                        />
                    </div>
                    <p className="text-center text-base font-normal text-black mb-3">Daily</p>
                    <div>
                        <label className="block text-lg font-medium mb-2 text-black">Daily layout</label>
                        <Select value={dailyLayout} onValueChange={setDailyLayout}>
                            <SelectTrigger className="w-full bg-white border-black rounded-md h-11">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="grid">Grid</SelectItem>
                                <SelectItem value="classic">Classic</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>



            {/* Download Button */}
            <div className="flex flex-col items-center gap-4 mt-12">
                {!isPaid ? (
                    <>
                        <Button
                            onClick={handlePurchase}
                            className="bg-[#9f5fc7] hover:bg-[#8b4fb0] text-white px-12 py-6 text-lg rounded-full h-auto font-normal"
                        >
                            Buy Now
                        </Button>
                        <div className="bg-gray-100 p-4 rounded-lg border border-gray-300">
                            <p className="text-sm text-gray-600 mb-2">Have an access code?</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={redeemCode}
                                    onChange={(e) => setRedeemCode(e.target.value)}
                                    placeholder="Enter code..."
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                                />
                                <Button
                                    onClick={handleRedeem}
                                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 text-sm rounded"
                                >
                                    Redeem
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <Button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="bg-[#9f5fc7] hover:bg-[#8b4fb0] text-white px-12 py-6 text-lg rounded-full h-auto font-normal"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Generating...
                            </span>
                        ) : (
                            'Download the Planner'
                        )}
                    </Button>
                )}
            </div>

            {/* Preview Modal */}
            {previewModal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
                    onClick={() => setPreviewModal(null)}
                >
                    <div className="relative max-w-4xl max-h-full">
                        <button
                            onClick={() => setPreviewModal(null)}
                            className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-colors"
                        >
                            ✕
                        </button>
                        <Image
                            src={previewModal}
                            alt="Preview"
                            width={1200}
                            height={1600}
                            className="max-w-full max-h-[90vh] object-contain rounded"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
