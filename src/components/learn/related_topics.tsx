import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import Markdown from '../ui/markdown'
import { Loader2 } from 'lucide-react'

export default function RelatedTopics({ relatedTopics }: { relatedTopics?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Related Topics</CardTitle>
      </CardHeader>
      <CardContent>
        {!relatedTopics ? (
          <div className="flex justify-center items-center min-h-24">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <Markdown contents={relatedTopics || ''} />
        )}
        {/* <ul className="list-disc pl-5">
          {relatedTopics.map((relatedTopic, index) => (
            <li key={index}>
              <Link href={`/dashboard?topic=${encodeURIComponent(relatedTopic)}`} className="text-blue-600 hover:underline">
                {relatedTopic}
              </Link>
            </li>
          ))}
        </ul> */}
      </CardContent>
    </Card>
  )
}
