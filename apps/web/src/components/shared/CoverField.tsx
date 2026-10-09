import type { useCover } from '@/lib/use-cover'
import { IMAGE_TYPES } from '@/api/images'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CoverField({
  cover,
  disabled,
}: {
  cover: ReturnType<typeof useCover>
  disabled: boolean
}) {
  return (
    <div
      className="space-y-3 rounded-lg border border-dashed p-4"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        if (!disabled && event.dataTransfer.files[0]) cover.choose(event.dataTransfer.files[0])
      }}
    >
      <Label htmlFor="resource-cover">Cover image</Label>
      {cover.preview && (
        <img
          src={cover.preview}
          alt="Cover preview"
          className="h-36 w-full rounded-lg object-cover"
        />
      )}
      <Input
        id="resource-cover"
        type="file"
        accept={IMAGE_TYPES.join(',')}
        disabled={disabled}
        onChange={(event) => {
          if (event.target.files?.[0]) cover.choose(event.target.files[0])
          event.target.value = ''
        }}
      />
      <p className="text-xs text-muted-foreground">
        Choose or drop an image. JPEG, PNG, WebP or GIF, up to 10 MB.
      </p>
      {cover.preview && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={cover.remove}
        >
          Remove cover
        </Button>
      )}
      {cover.error && (
        <p role="alert" className="text-sm text-destructive">
          {cover.error}
        </p>
      )}
    </div>
  )
}
