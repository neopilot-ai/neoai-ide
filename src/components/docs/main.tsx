'use client'

import Navbar from '../navbar'
import { useSession } from 'next-auth/react'
import Login from '../login'
import EnhancedDocsChat from './enhanced_chat'

export default function LiveDocs() {
  const { data: session } = useSession()
  if (!session) {
    return (
      <Login />
    )
  }
  return (
    <div className="flex flex-col h-screen">
      <Navbar showSettings={false} />
      <div className="flex-1 overflow-hidden">
        <EnhancedDocsChat />
      </div>
    </div>
  )
}