'use client'

import { useState, useEffect } from 'react'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { addMonths, startOfDay } from 'date-fns'
import { DateRange } from 'react-day-picker'

interface SidebarProps {
  onGenerate: (dateRange: { from: Date; to: Date } | undefined, temperature: number, fetchDiffs: boolean) => void
}

export function Sidebar({ onGenerate }: SidebarProps) {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>()
  const [temperature, setTemperature] = useState<number>(0.5)
  const [fetchDiffs, setFetchDiffs] = useState<boolean>(true)

  useEffect(() => {
    // Set default date range to 1 month until today
    const today = startOfDay(new Date())
    const oneMonthAgo = addMonths(today, -1)
    setDateRange({ from: oneMonthAgo, to: today })
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onGenerate(dateRange, temperature, fetchDiffs)
  }

  function handleSetDate(range: DateRange | undefined) {
    if (range?.from && range?.to) {
      setDateRange({ from: range.from, to: range.to }); // Only update with valid ranges
    } else {
      setDateRange(undefined); // Reset if range is invalid
    }
  }

  return (
    <aside className="w-80 bg-gray-100 dark:bg-gray-800 p-6 overflow-auto">
      <h2 className="text-xl font-semibold mb-4 dark:text-gray-200">Settings</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="dark:text-gray-300">Date Range</Label>
          <div className="pr-[10px]"> {/* Add 1px padding to prevent touching right margin */}
            <DatePickerWithRange date={dateRange} setDate={handleSetDate} />
          </div>
        </div>
        <div>
          <Label htmlFor="temperature" className="dark:text-gray-300">
            Temperature: {temperature.toFixed(1)}
          </Label>
          <Slider
            id="temperature"
            min={0}
            max={1}
            step={0.1}
            value={[temperature]}
            onValueChange={(value) => setTemperature(value[0])}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="fetch-diffs" checked={fetchDiffs} onCheckedChange={setFetchDiffs} />
          <Label htmlFor="fetch-diffs" className="dark:text-gray-300">Fetch Diffs</Label>
        </div>
        <Button type="submit" className="w-full">Generate Summary</Button>
      </form>
    </aside>
  )
}
