'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import Mermaid from '../../neoai-ide/src/components/ui/mermaid'
import { InsightsBlob } from '@/app/lib/actions/common/entities/blob'
import Markdown from "../../neoai-ide/src/components/ui/markdown"

interface BlobViewProps {
    blob: InsightsBlob
}

export default function BlobView({ blob }: BlobViewProps) {

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Analysis Results</h1>
      <p className="mb-8">Analysis for: {blob.path}</p>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Overall Explanation</CardTitle>
          </CardHeader>
          <CardContent>
            <Markdown contents={blob.analysis?.explanation || ''} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Code Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <Mermaid chart={blob.analysis?.code_flow || ''} />
          </CardContent>
        </Card>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="functions">
            <AccordionTrigger>Functions</AccordionTrigger>
            <AccordionContent>
              <Markdown contents={blob.analysis?.functions || ''} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="classes">
            <AccordionTrigger>Classes</AccordionTrigger>
            <AccordionContent>
              <Markdown contents={blob.analysis?.classes || ''} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="dependencies">
            <AccordionTrigger>Dependencies</AccordionTrigger>
            <AccordionContent>
              <Markdown contents={blob.analysis?.dependencies || ''} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="security">
            <AccordionTrigger>Security Aspects</AccordionTrigger>
            <AccordionContent>
              <Markdown contents={blob.analysis?.security || ''} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="performance">
            <AccordionTrigger>Performance Improvements</AccordionTrigger>
            <AccordionContent>
              <Markdown contents={blob.analysis?.performance_improvements || ''} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="dataDictionary">
            <AccordionTrigger>Data Dictionary</AccordionTrigger>
            <AccordionContent>
              <Markdown contents={blob.analysis?.data_dictionary || ''} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  )
}
  