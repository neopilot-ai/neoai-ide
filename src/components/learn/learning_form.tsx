'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Login from '../login'
import { useSession } from 'next-auth/react'

export default function LearningForm() {
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState('')
  const [background, setBackground] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('learningBackground') || ''
    }
    return ''
  })
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (background) {
      localStorage.setItem('learningBackground', background)
    }
  }, [background]);

  if (!session) {
    return <Login />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, you'd send this data to your backend
    router.push(`/learn/dashboard?topic=${encodeURIComponent(topic)}&level=${encodeURIComponent(level)}`)
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
        <div>
          <Label htmlFor="topic">What topic would you like to learn?</Label>
          <Input
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="level">What is your current level?</Label>
          <Select value={level} onValueChange={setLevel} required>
            <SelectTrigger>
              <SelectValue placeholder="Select your level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="background">Tell us more about your background (optional)</Label>
          <Textarea
            id="background"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            rows={4}
          />
        </div>
        <Button type="submit" className="w-full">Start Learning</Button>
      </form>
    </div>
  )
}
