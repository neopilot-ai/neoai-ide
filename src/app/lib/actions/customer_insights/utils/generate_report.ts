import { callAnthropic } from "@/app/lib/anthropic";

export async function generateReport<TReport>(
  prompt: string
): Promise<TReport> {
  try {
    const response = await callAnthropic(
      prompt,
      "claude-sonnet-4-0",
      8192
    );

    const jsonMatch = response.match(/{[\s\S]*}/);

    if (!jsonMatch) {
      throw new Error("No valid JSON found in the response.");
    }

    const jsonString = jsonMatch[0];
    const parsedData = JSON.parse(jsonString);

    return parsedData;
  } catch (error) {
    console.error("Error processing LLM response:", error);
    throw new Error("Failed to process LLM response.");
  }
}
