"use server";

import { NeoAiScopedLabel } from "../types";
import { fetchNeoAiScopedLabels } from "../utils/fetch_neoai_scoped_labels";

export async function fetchNeoAiCategoryLabels(): Promise<
  NeoAiScopedLabel[]
> {
  return await fetchNeoAiScopedLabels("Category:");
}
