import { Card, CardContent } from '@/components/ui/card'
import Markdown from '../ui/markdown'

export function SummaryDisplay({ summary }: { summary: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <Markdown contents={summary} />
      </CardContent>
    </Card>
  )
}
