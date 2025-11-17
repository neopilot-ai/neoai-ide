"use client";

import { fetchSources, Source } from "@/app/lib/actions/customer_insights";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";

interface SourceSelectorProps {
  selectedSources: string[];
  onChange: (updatedSources: string[]) => void;
}

export default function SourceSelector({
  selectedSources,
  onChange,
}: SourceSelectorProps) {
  const [availableSources, setAvailableSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSources() {
      try {
        const sources = await fetchSources();
        setAvailableSources(sources);
      } catch (error) {
        console.error("Failed to fetch sources:", error);
      } finally {
        setLoading(false);
      }
    }
    loadSources();
  }, []);

  const handleToggle = (sourceId: string) => {
    const updatedSources = selectedSources.includes(sourceId)
      ? selectedSources.filter((id) => id !== sourceId) // Remove if already selected
      : [...selectedSources, sourceId]; // Add if not selected

    onChange(updatedSources);
  };

  if (loading) {
    return <div>Loading sources...</div>;
  }

  return (
    <div className="space-y-2">
      {availableSources.map(({ id, title }) => (
        <div key={id} className="flex flex-wrap gap-4">
          <span>{title}</span>
          <Switch
            checked={selectedSources.includes(id)}
            onCheckedChange={() => handleToggle(id)}
          />
        </div>
      ))}
    </div>
  );
}
