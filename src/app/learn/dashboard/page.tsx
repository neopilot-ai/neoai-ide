import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Main from './main'

interface SearchParams {
  topic?: string
  level?: string
}

async function DashboardContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const {topic, level} = await searchParams

  if (!topic || !level) {
    notFound()
  }

  return <Main topic={topic} level={level} />
}

export default function Dashboard({ 
  searchParams 
}: { 
  searchParams: Promise<SearchParams>
}) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  )
}

