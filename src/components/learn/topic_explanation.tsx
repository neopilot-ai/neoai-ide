'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import Markdown from '../ui/markdown'

export default function TopicExplanation({
  explanation,
  complexity,
  onComplexityChange
}: {
  explanation?: string,
  complexity?: string,
  onComplexityChange: (complexity: string) => void
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gray-100 dark:bg-gray-800">
        <CardTitle className="flex items-center justify-between text-gray-900 dark:text-gray-100">
          <span>Topic Explanation</span>
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={() => onComplexityChange('simplified')}
              variant={complexity === 'simplified' ? 'default' : 'outline'}
            >
              Simple
            </Button>
            <Button
              size="sm"
              onClick={() => onComplexityChange('normal')}
              variant={complexity === 'normal' ? 'default' : 'outline'}
            >
              Normal
            </Button>
            <Button
              size="sm"
              onClick={() => onComplexityChange('detailed')}
              variant={complexity === 'detailed' ? 'default' : 'outline'}
            >
              Detailed
            </Button>
            <Button
              size="sm"
              onClick={() => onComplexityChange('technical')}
              variant={complexity === 'technical' ? 'default' : 'outline'}
            >
              Technical
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="mt-4">
        {!explanation ? (
          <div className="flex justify-center items-center min-h-24">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <Markdown contents={explanation} />
        )}
      </CardContent>
    </Card>
  )
}