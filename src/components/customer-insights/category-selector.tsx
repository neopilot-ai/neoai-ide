import {
  fetchNeoAiCategoryLabels,
  NeoAiScopedLabel,
} from "@/app/lib/actions/customer_insights";
import { Combobox } from "@/components/ui/combobox";
import { useState, useEffect } from "react";

interface CategorySelectorProps {
  selectedCategories: NeoAiScopedLabel[];
  onChange: (updatedGroups: NeoAiScopedLabel[]) => void;
}

export default function CategorySelector({
  selectedCategories: selectedGroups,
  onChange,
}: CategorySelectorProps) {
  const [allLabels, setAllLabels] = useState<NeoAiScopedLabel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLabels() {
      try {
        const labels = await fetchNeoAiCategoryLabels();
        setAllLabels(labels);
      } catch (error) {
        console.error("Failed to fetch NeoAi category labels:", error);
      } finally {
        setLoading(false);
      }
    }
    loadLabels();
  }, []);

  if (loading) {
    return <div>Loading labels...</div>;
  }

  return (
    <div className="space-y-2">
      <label className="block font-medium">NeoAi Categories</label>
      <Combobox<NeoAiScopedLabel>
        items={allLabels}
        itemToDisplay={(label) => label.value}
        itemToIdentifier={(label) => label.label}
        onChange={(updatedLabels) => onChange(updatedLabels)}
        selectedItems={selectedGroups}
      />
    </div>
  );
}
