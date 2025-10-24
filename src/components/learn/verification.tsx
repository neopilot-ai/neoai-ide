'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Loader2 } from "lucide-react"
import Markdown from '../ui/markdown'

export default function Verification({ 
  onVerification, 
  feedback 
}: { 
  onVerification: (explanation: string) => Promise<void>, 
  feedback?: string 
}) {
  const [explanation, setExplanation] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleVerification = async () => {
    setIsLoading(true)
    try {
      await onVerification(explanation)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify Your Understanding</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">Explain the topic in your own words:</p>
        <Textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={4}
          className="mb-4"
          disabled={isLoading}
        />
        <Button 
          onClick={handleVerification}
          disabled={!explanation.trim() || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            'Check'
          )}
        </Button>
        {feedback && <div className="mt-4"><Markdown contents={feedback}/></div>}
      </CardContent>
    </Card>
  )
}