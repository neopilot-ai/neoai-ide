'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/my_achievements/sidebar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MergeRequestTable } from '@/components/my_achievements/merge_request_list'
import { ProjectList } from '@/components/my_achievements/project_list'
import { SummaryDisplay } from '@/components/my_achievements/summary_display'
import Navbar from '../navbar'
import { getAllMRsAndProjects } from '@/app/lib/actions/common/get_all_mrs'
import { MergeRequest } from '@/app/lib/actions/common/entities/merge_request'
import { Project } from '@/app/lib/actions/common/entities/project'
import { useSession } from 'next-auth/react'
import Login from '../login'
import { summarizeAchievements } from '@/app/lib/actions/achievements/actions'
import { Loader2, CheckCircle2 } from 'lucide-react'

export default function NeoAiAchievementSummary() {
  const [mergeRequests, setMergeRequests] = useState<MergeRequest[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [summary, setSummary] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [loadingStatus, setLoadingStatus] = useState<string>('')
  const [isDataGenerated, setIsDataGenerated] = useState<boolean>(false)

  const { data: session } = useSession();

  if (!session) {
    return (
      <Login />
    );
  }

  const handleGenerate = async (dateRange: { from: Date; to: Date } | undefined, temperature: number, fetchDiffs: boolean) => {
    try {
      setIsLoading(true)
      setLoadingStatus('')
      setLoadingStatus('Fetching Merge Requests & Projects...')
      const {mergeRequests, projects} = await getAllMRsAndProjects(dateRange, fetchDiffs);
      
      setLoadingStatus('Merge Requests & Projects fetched')
      setMergeRequests(mergeRequests)
      setProjects(projects)
      
      setLoadingStatus('Generating AI Summary...')
      const summary = await summarizeAchievements(mergeRequests, temperature);
      setSummary(summary);
      
      setLoadingStatus('Summary Generated')
      setIsDataGenerated(true)
    } catch (error) {
      console.error('Error generating summary:', error)
      setLoadingStatus('Error generating summary')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <Navbar showSettings={false} />
      <div className="flex h-screen">
        <Sidebar onGenerate={handleGenerate} />
        <main className="flex-1 p-6 overflow-auto">
          <h1 className="text-3xl font-bold mb-6">My Achievements</h1>
          
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">AI-Powered Achievement Log</h3>
            <p className="text-blue-700 dark:text-blue-100 mb-2">
              This log, powered by AI, does not encompass all your MRs, given its 1500-word limitation. It is a concise selection and does not cover confidential issues or private repositories.
            </p>
            <p className="text-blue-700 dark:text-blue-100">
              For those seeking to use this as a data point for talent assessments, it is imperative to click on the links associated with the summaries rigorously to verify their accuracy.
            </p>
          </div>

          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-64 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="flex items-center space-x-2">
                {loadingStatus && (
                  <>
                    {loadingStatus.includes('Error') ? (
                      <span className="text-red-500">{loadingStatus}</span>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="text-muted-foreground">{loadingStatus}</span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : !isDataGenerated ? (
            <div className="flex justify-center items-center h-64 text-xl text-muted-foreground">
              No data has been selected yet. Use the sidebar to generate your achievement summary.
            </div>
          ) : (
            <Tabs defaultValue="merge-requests">
              <TabsList>
                <TabsTrigger value="merge-requests">Merge Requests</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>
              <TabsContent value="merge-requests">
                <MergeRequestTable mergeRequests={mergeRequests} />
              </TabsContent>
              <TabsContent value="projects">
                <ProjectList projects={projects} />
              </TabsContent>
              <TabsContent value="summary">
                <SummaryDisplay summary={summary} />
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>
    </div>
  )
}
