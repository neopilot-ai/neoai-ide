import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StrategicRecommendations from './tabs/strategic_recommendations';
import { CustomerInsightsReport } from "@/app/lib/actions/customer_insights/types"
import BugReportTab from './tabs/bug_report';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ReportTabs({ results }: { results: CustomerInsightsReport }) {
  return (
    <Tabs defaultValue="strategic">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="strategic">Strategic Recommendations</TabsTrigger>
        <TabsTrigger value="bug">Bug Report Insights</TabsTrigger>
        <TabsTrigger value="ux">UX Issues Insights</TabsTrigger>
      </TabsList>
      <TabsContent value="strategic">
        <StrategicRecommendations data={results.strategicRecommendations} />
      </TabsContent>
      <TabsContent value="bug">
        <BugReportTab data={results.bugReport} />
      </TabsContent>
      <TabsContent value="ux">
        <div>UX Insights placeholder</div>
      </TabsContent>
    </Tabs>
  );
}