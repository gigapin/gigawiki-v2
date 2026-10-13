import { useEffect, useState } from 'react'

import { useSaveProfile } from '@/api/users'
import { IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/api/images'
import { useAuthStore } from '@/stores/auth.store'
import { apiErrorMessage } from '@/lib/api-error'
import { ResendVerificationForm } from '@/components/auth/ResendVerificationForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (preview) return () => URL.revokeObjectURL(preview)
  }, [preview])
  const mutation = useSaveProfile({
    onProfileSaved: (updated) => {
      setName(updated.name)
      setEmail(updated.email)
      setNotice(
        updated.verificationDeliveryFailed
          ? 'Profile saved, but the verification email could not be sent. Use Resend below.'
          : !updated.emailConfirmed
            ? 'Profile saved. Verify your email before your next sign-in.'
            : 'Profile saved.',
      )
    },
    onAvatarSaved: () => {
      setFile(null)
      setPreview('')
    },
    onAvatarError: (cause) =>
      setError(`Profile saved. Avatar upload failed: ${apiErrorMessage(cause)}`),
  })
  if (!user) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="space-y-5"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            setError('')
            setNotice('')
            if (!name.trim() || name.trim().length > 100)
              return setError('Enter a name between 1 and 100 characters.')
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
              return setError('Enter a valid email address.')
            if (!mutation.isPending) mutation.mutate({ name, email, file })
          }}
        >
          <fieldset disabled={mutation.isPending} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="profile-avatar">Avatar</Label>
              {(preview || user.avatar?.url) && (
                <img
                  src={preview || user.avatar?.url}
                  alt="Avatar preview"
                  className="h-20 w-20 rounded-full object-cover"
                />
              )}
              <Input
                id="profile-avatar"
                type="file"
                accept={IMAGE_TYPES.join(',')}
                onChange={(event) => {
                  const selected = event.target.files?.[0]
                  setError('')
                  mutation.reset()
                  if (!selected) return
                  if (!IMAGE_TYPES.includes(selected.type) || selected.size > MAX_IMAGE_SIZE) {
                    event.target.value = ''
                    return setError('Choose a JPEG, PNG, WebP or GIF image up to 10 MB.')
                  }
                  setFile(selected)
                  setPreview(URL.createObjectURL(selected))
                }}
              />
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, WebP or GIF, up to 10 MB. Saved as a square avatar.
              </p>
              {file && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFile(null)
                    setPreview('')
                  }}
                >
                  Cancel selected avatar
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                autoComplete="name"
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Changing your email requires verification of the new address.
              </p>
            </div>
          </fieldset>
          {(error || mutation.isError) && (
            <p role="alert" className="text-sm text-destructive">
              {error || apiErrorMessage(mutation.error)}
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm">
              {notice}
            </p>
          )}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save profile'}
          </Button>
        </form>
        {!user.emailConfirmed && (
          <ResendVerificationForm key={user.email} initialEmail={user.email} />
        )}
      </CardContent>
    </Card>
  )
}
