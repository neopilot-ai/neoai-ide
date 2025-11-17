import { Project } from '@/app/lib/actions/common/entities/project'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export function ProjectList({ projects }: { projects: Project[] }) {
  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <Card key={project.id}>
          <CardContent className="p-4">
            <div className="flex items-start space-x-4">
              <div className="flex-grow min-w-0">
                <h3 className="font-semibold text-lg truncate">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {project.description}
                  </p>
                )}
              </div>
              {project.web_url && (
                <Link 
                  href={project.web_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 transition-colors shrink-0"
                >
                  View Project
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
