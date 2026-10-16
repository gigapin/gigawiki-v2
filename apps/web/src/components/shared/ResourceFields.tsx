import { lazy, Suspense, useState } from 'react'

import { Button } from '@/components/ui/button'
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

const RichDescriptionEditor = lazy(() =>
  import('./RichDescriptionEditor').then((module) => ({ default: module.RichDescriptionEditor })),
)

export type ResourceValues = {
  name: string
  description: string
  descriptionFormat?: 'text' | 'html'
  visibility: 'PUBLIC' | 'PRIVATE'
}

export function ResourceFields({
  id,
  values,
  onChange,
  disabled,
  maxNameLength = 200,
}: {
  id: string
  values: ResourceValues
  onChange: (values: ResourceValues) => void
  disabled: boolean
  maxNameLength?: number
}) {
  const [rich, setRich] = useState(values.descriptionFormat === 'html')
  return (
    <fieldset disabled={disabled} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${id}-name`}>Name</Label>
        <Input
          id={`${id}-name`}
          autoFocus
          required
          maxLength={maxNameLength}
          value={values.name}
          onChange={(event) => onChange({ ...values, name: event.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-description`}>Description</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || rich}
          onClick={() => {
            setRich(true)
            onChange({
              ...values,
              description: values.description
                .split('\n')
                .map(
                  (line) =>
                    '<p>' +
                    line.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;') +
                    '</p>',
                )
                .join(''),
              descriptionFormat: 'html',
            })
          }}
        >
          Use formatted description
        </Button>
        {rich ? (
          <Suspense fallback={<p>Loading description editor…</p>}>
            <RichDescriptionEditor
              value={values.description}
              disabled={disabled}
              onChange={(description) =>
                onChange({ ...values, description, descriptionFormat: 'html' })
              }
            />
          </Suspense>
        ) : (
          <Textarea
            id={`${id}-description`}
            rows={4}
            value={values.description}
            onChange={(event) => onChange({ ...values, description: event.target.value })}
          />
        )}
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
