import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type ResourceValues = { name: string; description: string; visibility: 'PUBLIC' | 'PRIVATE' }

export function ResourceFields({
  id,
  values,
  onChange,
  disabled,
}: {
  id: string
  values: ResourceValues
  onChange: (values: ResourceValues) => void
  disabled: boolean
}) {
  return (
    <fieldset disabled={disabled} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${id}-name`}>Name</Label>
        <Input
          id={`${id}-name`}
          autoFocus
          required
          maxLength={200}
          value={values.name}
          onChange={(event) => onChange({ ...values, name: event.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-description`}>Description</Label>
        <Textarea
          id={`${id}-description`}
          rows={4}
          value={values.description}
          onChange={(event) => onChange({ ...values, description: event.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-visibility`}>Visibility</Label>
        <Select
          disabled={disabled}
          value={values.visibility}
          onValueChange={(visibility: ResourceValues['visibility']) =>
            onChange({ ...values, visibility })
          }
        >
          <SelectTrigger id={`${id}-visibility`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PUBLIC">Public</SelectItem>
            <SelectItem value="PRIVATE">Private</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </fieldset>
  )
}
