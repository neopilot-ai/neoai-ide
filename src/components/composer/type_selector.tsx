import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TypeSelectorProps {
  type: 'issue' | 'mr' | 'email' | 'slack' | 'epic';
  setType: (type: 'issue' | 'mr' | 'email' | 'slack' | 'epic') => void
}

export default function TypeSelector({ type, setType }: TypeSelectorProps) {
  return (
    <div className="p-4 border-b border-border">
      <Select value={type} onValueChange={(value) => setType(value as 'issue' | 'mr' | 'email' | 'slack' | 'epic')}>
        <SelectTrigger>
          <SelectValue placeholder="Select type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="issue">Issue</SelectItem>
          <SelectItem value="mr">Merge Request</SelectItem>
          <SelectItem value="epic">Epic</SelectItem>
          <SelectItem value="email">Email</SelectItem>
          <SelectItem value="slack">Slack</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
