'use client'

import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

interface MermaidProps {
  chart: string
}

export default function Mermaid({ chart }: MermaidProps) {
  const mermaidRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    mermaid.initialize({ startOnLoad: true })
    mermaid.contentLoaded()
  }, [])

  useEffect(() => {
    if (mermaidRef.current) {
      mermaid.render('mermaid', chart).then((result) => {
        mermaidRef.current!.innerHTML = result.svg
      })
    }
  }, [chart])

  return <div ref={mermaidRef} className="mermaid"></div>
}