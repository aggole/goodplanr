"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function PlannerBuilder() {
  const [includeCulturalDays, setIncludeCulturalDays] = useState(false)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Logo and Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <HexagonLogo />
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
          <Select defaultValue="2026">
            <SelectTrigger className="w-full bg-white border-black rounded-md h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Week Starts On */}
        <div>
          <label className="block text-lg font-medium mb-3 text-black">Week Starts On</label>
          <Select defaultValue="monday">
            <SelectTrigger className="w-full bg-white border-black rounded-md h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monday">Monday / Sunday</SelectItem>
              <SelectItem value="sunday">Sunday</SelectItem>
              <SelectItem value="monday-only">Monday</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Holidays */}
        <div>
          <label className="block text-lg font-medium mb-3 text-black">Holidays</label>
          <Select defaultValue="usa">
            <SelectTrigger className="w-full bg-white border-black rounded-md h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="usa">USA</SelectItem>
              <SelectItem value="uk">UK</SelectItem>
              <SelectItem value="canada">Canada</SelectItem>
              <SelectItem value="australia">Australia</SelectItem>
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
          <div className="aspect-[3/4] border-2 border-gray-300 rounded bg-white flex items-center justify-center mb-3">
            <span className="text-sm text-gray-700">Preview image</span>
          </div>
          <p className="text-center text-base font-normal text-black">Monthly</p>
        </div>

        {/* Weekly Preview */}
        <div>
          <div className="aspect-[3/4] border-2 border-gray-300 rounded bg-white flex items-center justify-center mb-3">
            <span className="text-sm text-gray-700">Preview image</span>
          </div>
          <p className="text-center text-base font-normal text-black mb-3">Weekly</p>
          <div>
            <label className="block text-lg font-medium mb-2 text-black">Weekly layout</label>
            <Select defaultValue="vertical">
              <SelectTrigger className="w-full bg-white border-black rounded-md h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vertical">Vertical / Flexi</SelectItem>
                <SelectItem value="horizontal">Horizontal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Daily Preview */}
        <div>
          <div className="aspect-[3/4] border-2 border-gray-300 rounded bg-white flex items-center justify-center mb-3">
            <span className="text-sm text-gray-700">Preview image</span>
          </div>
          <p className="text-center text-base font-normal text-black mb-3">Daily</p>
          <div>
            <label className="block text-lg font-medium mb-2 text-black">Daily layout</label>
            <Select defaultValue="grid">
              <SelectTrigger className="w-full bg-white border-black rounded-md h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid / Classic</SelectItem>
                <SelectItem value="vertical">Vertical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Download Button */}
      <div className="flex justify-center mt-12">
        <Button className="bg-[#9f5fc7] hover:bg-[#8b4fb0] text-white px-12 py-6 text-lg rounded-full h-auto font-normal">
          Download the Planner
        </Button>
      </div>
    </div>
  )
}

function HexagonLogo() {
  return (
    <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" fill="black" stroke="black" strokeWidth="3" />
      <path d="M50 25 L72 37.5 L72 62.5 L50 75 L28 62.5 L28 37.5 Z" fill="white" stroke="white" strokeWidth="2" />
      <path d="M50 35 L40 45 L40 60 L60 60 L60 40 L55 35 Z" fill="black" />
    </svg>
  )
}
