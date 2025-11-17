import { Metadata } from 'next'
import Main from '@/components/docs/main'

export const metadata: Metadata = {
    title: 'Live Docs',
    description: 'Query live documentation with real-time context',
}

export default function LiveDocs() {
    return (
        <Main />
    )
}