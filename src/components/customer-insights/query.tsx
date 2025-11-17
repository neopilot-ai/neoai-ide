"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import {
  CustomerInsightsQuery,
  NeoAiScopedLabel,
} from "@/app/lib/actions/customer_insights";
import { addMonths, startOfDay } from "date-fns";
import SourceSelector from "./source-selector";
import GroupSelector from "./group-selector";
import CategorySelector from "./category-selector";

export default function QueryInterface({
  onSubmit,
}: {
  onSubmit: (queryData: CustomerInsightsQuery) => void;
}) {
  const [dataSources, setDataSources] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<NeoAiScopedLabel[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<
    NeoAiScopedLabel[]
  >([]);

  const [projectId, setProjectId] = useState("");
  const [dateRange, setDateRange] = useState<
    { from: Date; to: Date } | undefined
  >();

  useEffect(() => {
    // Set default date range to 1 month until today
    const today = startOfDay(new Date());
    const oneMonthAgo = addMonths(today, -1);
    setDateRange({ from: oneMonthAgo, to: today });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      sources: dataSources,
      projectId: projectId,
      categoryLabels: selectedCategories.map((category) => category.label),
      groupLabels: selectedGroups.map((group) => group.label),
      dateRange: {
        start: dateRange?.from.toISOString() ?? "",
        end: dateRange?.to.toISOString() ?? "",
      },
    });
  };

  function handleSetDate(range: DateRange | undefined) {
    if (range?.from && range?.to) {
      setDateRange({ from: range.from, to: range.to }); // Only update with valid ranges
    } else {
      setDateRange(undefined); // Reset if range is invalid
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 mb-6 flex flex-1 flex-col"
    >
      <div className="p-4 border-border flex flex-col flex-1 gap-3">
        {/* Data Sources */}
        <div className="space-y-4 p-4 border rounded-md bg-muted/20">
          <h3 className="text-md font-semibold">Data Sources</h3>
          <SourceSelector
            selectedSources={dataSources}
            onChange={setDataSources}
          />
          <div className="space-y-2">
            <label className="block font-medium">Project ID</label>
            <Input
              placeholder="Enter project ID"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Time Range */}
        <div className="space-y-4 p-4 border rounded-md bg-muted/20">
          <h3 className="text-md font-semibold">Time Range</h3>
          <DatePickerWithRange date={dateRange} setDate={handleSetDate} />
        </div>

        {/* Labels Section */}
        <div className="space-y-4 p-4 border rounded-md bg-muted/20">
          <h3 className="text-md font-semibold">NeoAi Labels</h3>
          <GroupSelector
            selectedGroups={selectedGroups}
            onChange={setSelectedGroups}
          />
          <CategorySelector
            selectedCategories={selectedCategories}
            onChange={setSelectedCategories}
          />
        </div>
      </div>
      <div className="p-2">
        <Button type="submit" className="w-full">
          Submit Query
        </Button>
      </div>
    </form>
  );
}
