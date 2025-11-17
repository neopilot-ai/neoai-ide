import Main from '@/components/my_achievements/main'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Achievement Log',
  description: 'Track your achievements and progress',
}

export default function AchievementLog() {
  return (
    <Main />
  )
}
