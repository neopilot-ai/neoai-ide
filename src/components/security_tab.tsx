import { MergeRequest } from "@/app/lib/actions/common/entities/merge_request";
import Markdown from "../../neoai-ide/src/components/ui/markdown";

export const SecuritySection = ({ mrData }: {mrData: MergeRequest}) => (
  <div className="space-y-4">
    <div className="bg-muted/50 rounded-lg p-4">
      <div className="space-y-2">
        {mrData.summary && (
          <div className="mt-3">
            <Markdown contents={mrData.securityReview} />
          </div>
        )}
      </div>
    </div>
  </div>
)
