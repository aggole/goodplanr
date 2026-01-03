import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"
import { client, queries, urlFor } from "@/lib/sanity.client"
import FeaturedReviews from "@/components/FeaturedReviews"

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
    const [progress, setProgress] = useState(0)
    const [previewModal, setPreviewModal] = useState<string | null>(null)
    const [currentSlide, setCurrentSlide] = useState(0)
    const [isPaid, setIsPaid] = useState(false)
    const [redeemCode, setRedeemCode] = useState('')
    const [banners, setBanners] = useState<any[]>([])
    const [isEnlarged, setIsEnlarged] = useState(false)
    const [reviews, setReviews] = useState<any[]>([])

    // Default hero banner slides (fallback)
    // Default hero banner slides (fallback)
    const defaultSlides: { image: string, caption: string }[] = []

    // Fetch banners from Sanity
    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const data = await client.fetch(queries.banners);
                if (data && data.length > 0) {
                    setBanners(data);
                }
            } catch (error) {
                console.error("Failed to fetch banners:", error);
            }
        };
        fetchBanners();
    }, []);

    // Fetch reviews from Sanity
    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const data = await client.fetch(`*[_type == "review"] | order(defined(images[0]) desc, date desc) {
                    _id,
                    author,
                    rating,
                    content,
                    date,
                    verified,
                    images[] {
                        asset->{
                            url
                        }
                    }
                }`);
                if (data && data.length > 0) {
                    setReviews(data);
                }
            } catch (error) {
                console.error("Failed to fetch reviews:", error);
            }
        };
        fetchReviews();
    }, []);

    // Combine Sanity banners with default slides
    const activeSlides = banners.length > 0
        ? banners.map(b => ({
            image: b.image ? urlFor(b.image).width(1800).height(800).url() : '',
            caption: b.title || ''
        }))
        : defaultSlides;

    // Auto-rotate banner slides (pause when enlarged)
    useEffect(() => {
        if (isEnlarged || activeSlides.length === 0) return;

        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % activeSlides.length)
        }, 5000) // Change slide every 5 seconds
        return () => clearInterval(interval)
    }, [activeSlides.length, isEnlarged])

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
        setProgress(0)

        // Simulated progress bar
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 95) return prev
                // Fast start, slow end
                const increment = prev < 30 ? 5 : prev < 70 ? 2 : 1
                return prev + increment
            })
        }, 500)

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

            clearInterval(progressInterval)
            setProgress(100)

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
            clearInterval(progressInterval)
            setLoading(false)
            setProgress(0)
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
        if (code === 'PLAN2026' || code === 'VIP-ACCESS' || code === 'F35652F195AD9A47') {
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

            {/* Hero Banner Slideshow */}
            <div className="mb-12">
                <div
                    className="relative w-full h-64 md:h-96 bg-gray-200 rounded-lg overflow-hidden border border-gray-300 group cursor-zoom-in"
                    onClick={() => setIsEnlarged(true)}
                >
                    {activeSlides.map((slide, index) => (
                        <div
                            key={index}
                            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'
                                }`}
                        >
                            {slide.image && !slide.image.includes('placeholder') ? (
                                <Image
                                    src={slide.image}
                                    alt={slide.caption}
                                    fill
                                    className="object-cover"
                                    priority={index === 0}
                                    unoptimized
                                />
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${index % 4 === 0 ? 'from-purple-400 to-blue-500' :
                                    index % 4 === 1 ? 'from-pink-400 to-purple-500' :
                                        index % 4 === 2 ? 'from-blue-400 to-cyan-500' :
                                            'from-indigo-400 to-purple-500'
                                    }`}>
                                    <span className="text-white text-3xl md:text-4xl font-light">Slide {index + 1}</span>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Left Arrow */}
                    {/* Left Arrow */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentSlide(prev => (prev - 1 + activeSlides.length) % activeSlides.length);
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/70 hover:bg-white text-gray-800 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-20"
                        aria-label="Previous slide"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>

                    {/* Right Arrow */}
                    {/* Right Arrow */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentSlide(prev => (prev + 1) % activeSlides.length);
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/70 hover:bg-white text-gray-800 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-20"
                        aria-label="Next slide"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </button>

                    {/* Navigation Dots */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
                        {activeSlides.map((_, index) => (
                            <button
                                key={index}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentSlide(index);
                                }}
                                className={`w-2 h-2 rounded-full transition-all border border-white/50 ${index === currentSlide ? 'bg-gray-800 w-8' : 'bg-gray-400'
                                    }`}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Caption */}
                <div className="text-center mt-4">
                    <p className="text-lg text-gray-700 font-light">
                        {activeSlides[currentSlide]?.caption}
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
                        <div className="w-full max-w-md">
                            <p className="text-center text-gray-700 mb-3 text-lg">Download your planner</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={redeemCode}
                                    onChange={(e) => setRedeemCode(e.target.value)}
                                    placeholder="Enter Access Code"
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-[#9f5fc7] focus:border-transparent outline-none"
                                />
                                <Button
                                    onClick={handleRedeem}
                                    className="bg-[#9f5fc7] hover:bg-[#8b4fb0] text-white px-8 py-3 text-lg rounded-lg h-auto font-normal transition-colors"
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
                        className="w-full max-w-md bg-[#9f5fc7] hover:bg-[#8b4fb0] text-white py-8 text-lg rounded-full h-auto font-normal relative overflow-hidden transition-all"
                    >
                        {loading ? (
                            <>
                                {/* Progress bar background */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 bg-white/20 transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                />

                                <span className="flex items-center gap-2 relative z-10">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Generating Planner... {progress}%
                                </span>
                            </>
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
            {/* Slideshow Lightbox Modal */}
            {isEnlarged && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
                    onClick={() => setIsEnlarged(false)}
                >
                    <div className="relative w-full max-w-7xl h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setIsEnlarged(false)}
                            className="absolute top-4 right-4 text-white hover:text-gray-300 z-50"
                        >
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>

                        {/* Navigation Buttons in Modal */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setCurrentSlide(prev => (prev - 1 + activeSlides.length) % activeSlides.length);
                            }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white text-black hover:scale-110 transition-all z-50 shadow-lg"
                        >
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setCurrentSlide(prev => (prev + 1) % activeSlides.length);
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white text-black hover:scale-110 transition-all z-50 shadow-lg"
                        >
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </button>

                        <div className="relative w-full h-full max-h-[85vh]">
                            <Image
                                src={activeSlides[currentSlide].image}
                                alt={activeSlides[currentSlide].caption}
                                fill
                                className="object-contain"
                                priority
                                unoptimized
                            />
                        </div>

                        <div className="absolute bottom-8 left-0 right-0 text-center text-white/90 text-xl font-light">
                            {activeSlides[currentSlide].caption}
                        </div>
                    </div>
                </div>
            )}

            {/* Featured Reviews */}
            {reviews.length > 0 && <FeaturedReviews reviews={reviews} />}

            {/* Footer */}
            <footer className="mt-24 pb-8 text-center border-t border-gray-200 pt-8">
                <div className="flex flex-col items-center justify-center gap-4">
                    <Image
                        src="/images/goodplanr-logo.png"
                        alt="GoodPlanr Logo"
                        width={40}
                        height={40}
                        className="w-auto h-10 object-contain opacity-80"
                    />
                    <p className="text-sm text-gray-500">
                        &copy; {new Date().getFullYear()} GoodPlanr. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    )
}
