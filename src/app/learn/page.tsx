import { Metadata } from 'next'
import LearningForm from '@/components/learn/learning_form'
import Navbar from '@/components/navbar'

export const metadata: Metadata = {
  title: 'AI Microlearning App',
  description: 'Learn any programming topic with AI-powered microlearning',
}

export default function Home() {
  return (
    <div>
      <Navbar showSettings={false} />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">AI Microlearning App</h1>
        <LearningForm />
      </main>
    </div>
  )
}