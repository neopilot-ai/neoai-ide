import React from "react";
import { BugReport } from "@/app/lib/actions/customer_insights/types";

export default function BugReportTab({ data }: { data: BugReport }) {
  return (
    <div className="bug-report-tab">
      <h2 className="text-2xl font-bold mb-4">Bug Report Insights</h2>

      {/* Common Bug Types */}
      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-2">Common Bug Types</h3>
        <table className="w-full border-collapse border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-4 py-2">Type</th>
              <th className="border border-gray-300 px-4 py-2">Count</th>
              <th className="border border-gray-300 px-4 py-2">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {data.common_bug_types.map((bugType, index) => (
              <tr key={index}>
                <td className="border border-gray-300 px-4 py-2">
                  {bugType.type}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {bugType.count}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {bugType.percentage}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Frequency Over Time */}
      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-2">Frequency Over Time</h3>
        <table className="w-full border-collapse border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-4 py-2">Period</th>
              <th className="border border-gray-300 px-4 py-2">Bug Count</th>
            </tr>
          </thead>
          <tbody>
            {data.frequency_over_time.map((freq, index) => (
              <tr key={index}>
                <td className="border border-gray-300 px-4 py-2">
                  {freq.period}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {freq.bug_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Average Resolution Time */}
      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-2">Average Resolution Time</h3>
        <p className="text-gray-700">{data.average_resolution_time} days</p>
      </section>

      {/* Potential Root Causes */}
      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-2">Potential Root Causes</h3>
        <ul className="list-disc list-inside">
          {data.potential_root_causes.map((rootCause, index) => (
            <li key={index} className="mb-2">
              <strong>Cause:</strong> {rootCause.cause}
              <br />
              <strong>Related Bugs:</strong>{" "}
              {rootCause.related_bugs.map((bug) => {
                return (
                  <a key={bug.id} href={bug.url}>
                    {bug.title}
                  </a>
                );
              })}
            </li>
          ))}
        </ul>
      </section>

      {/* Recommendations */}
      <section>
        <h3 className="text-xl font-semibold mb-2">Recommendations</h3>
        <ul className="list-disc list-inside">
          {data.recommendations.map((recommendation, index) => (
            <li key={index} className="mb-2">
              <strong>Recommendation:</strong> {recommendation.recommendation}
              <br />
              <strong>Impact:</strong> {recommendation.impact}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
