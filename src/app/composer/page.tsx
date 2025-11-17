import { Metadata } from 'next'
import Main from '@/components/composer/main'

export const metadata: Metadata = {
  title: 'Composer',
  description: 'Author slack posts, emails, issues and MRs',
}

export default function Composer() { 
  return (
    <Main />
  )
}