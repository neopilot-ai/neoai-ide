import { CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "../../neoai-ide/src/components/ui/button";

export default function CacheBanner({ handleRefresh, isRefreshing }: { handleRefresh: () => void; isRefreshing: boolean }) {
  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <CheckCircle2 className="h-5 w-5 text-blue-500" />
        <div>
          <p className="text-sm text-blue-700">
          Showing cached results.
          </p>
        </div>
      </div>
      <Button 
      variant="outline" 
      size="sm" 
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="flex items-center space-x-2"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span>{isRefreshing ? 'Refreshing...' : 'Refresh Analysis'}</span>
      </Button>
    </div>
  )
}