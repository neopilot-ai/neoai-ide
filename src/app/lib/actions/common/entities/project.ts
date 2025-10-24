export interface Project {
  id: number;
  name: string;
  description: string;
  visibility: 'private' | 'internal' | 'public';
  path_with_namespace: string;
  web_url: string;
}