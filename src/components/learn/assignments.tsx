import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import Markdown from '../ui/markdown'
import { Loader2 } from 'lucide-react'

export default function Assignments({ assignments }: { assignments?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assignments</CardTitle>
      </CardHeader>
      <CardContent>
        {!assignments ? (
          <div className="flex justify-center items-center min-h-24">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <Markdown contents={assignments || ''} />
        )}
      </CardContent>
    </Card>
  )
}
