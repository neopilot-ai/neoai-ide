import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import Markdown from '../ui/markdown'
import { Loader2 } from 'lucide-react'

export default function CodeExamples({ codeExamples }: { codeExamples?: string  }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Code Examples</CardTitle>
      </CardHeader>
      <CardContent>
        {!codeExamples ? (
          <div className="flex justify-center items-center min-h-24">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <Markdown contents={codeExamples || ''} />
        )}
      </CardContent>
    </Card>
  )
}
