import { DashboardShell } from "@/components/dashboard-shell"
import { DeveloperDashboard } from "@/components/developer-dashboard"
import { NeoPilot } from "@neopilot/react-core"

export default function Home() {
  return (
    <DashboardShell>
      <DeveloperDashboard />
    </DashboardShell>
  )
}
