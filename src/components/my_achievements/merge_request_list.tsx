import { MergeRequest } from '@/app/lib/actions/common/entities/merge_request'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

export function MergeRequestTable({ mergeRequests }: { mergeRequests: MergeRequest[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Milestone</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Merged</TableHead>
            <TableHead>Merged in Days</TableHead>
            <TableHead>No of Comments</TableHead>
            <TableHead>Changed Lines</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mergeRequests.map((mr) => {
            const createdDate = new Date(mr.created_at);
            const mergedDate = mr.merged_at ? new Date(mr.merged_at) : null;
            const mergedInDays = mergedDate
              ? Math.ceil((mergedDate.getTime() - createdDate.getTime()) / (1000 * 3600 * 24))
              : null;

            return (
              <TableRow key={mr.id}>
                <TableCell className="font-medium">
                  <Link 
                    href={mr.web_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                  >
                    {mr.title}
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </TableCell>
                <TableCell>{mr.projectDetails?.name || 'N/A'}</TableCell>
                <TableCell>{mr.milestone?.title || 'N/A'}</TableCell>
                <TableCell>{createdDate.toLocaleDateString()}</TableCell>
                <TableCell>{mergedDate ? mergedDate.toLocaleDateString() : 'Not merged'}</TableCell>
                <TableCell>{mergedInDays !== null ? `${mergedInDays} day${mergedInDays !== 1 ? 's' : ''}` : 'N/A'}</TableCell>
                <TableCell>{mr.user_notes_count || 0}</TableCell>
                <TableCell>{mr.changed_lines || 0}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

