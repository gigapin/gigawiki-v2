import { useState } from 'react'
import { InviteSchema } from '@shared/schemas/auth.schema'
import type { InviteDto } from '@shared/schemas/auth.schema'

import { useInviteUser, invitationSavedWithoutEmail } from '@/api/users'
import { useAuthStore } from '@/stores/auth.store'
import { apiErrorMessage } from '@/lib/api-error'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function InvitesPage() {
  const user = useAuthStore((s) => s.user)
  const mutation = useInviteUser()
  const [values, setValues] = useState<InviteDto>({ email: '', role: 'GUEST' })
  const [errors, setErrors] = useState<Partial<Record<keyof InviteDto, string>>>({})
  const savedWithoutEmail = invitationSavedWithoutEmail(mutation.error)
  if (user?.role !== 'ADMIN')
    return (
      <div className="p-6">
        <p role="alert">Only administrators can invite users.</p>
      </div>
    )
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6 lg:p-9">
      <header>
        <p className="text-sm text-muted-foreground">Settings</p>
        <h1 className="text-3xl font-semibold">Invitations</h1>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Invite a user</CardTitle>
          <CardDescription>
            Send an email invitation to join GigaWiki. The link expires in 7 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mutation.isSuccess ? (
            <div className="space-y-4">
              <p role="status">
                Invitation email queued for{' '}
                <strong className="break-all">{mutation.data.email}</strong> with role{' '}
                {mutation.data.role}.
              </p>
              <Button
                onClick={() => {
                  mutation.reset()
                  setValues({ email: '', role: 'GUEST' })
                  setErrors({})
                }}
              >
                Invite another user
              </Button>
            </div>
          ) : savedWithoutEmail ? (
            <p role="alert" className="text-sm text-destructive">
              The invitation was saved, but its email could not be queued. Contact the administrator
              responsible for email delivery before creating another invitation for this address.
            </p>
          ) : (
            <form
              noValidate
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                const result = InviteSchema.safeParse({
                  ...values,
                  email: values.email.trim().toLowerCase(),
                })
                const next: Partial<Record<keyof InviteDto, string>> = {}
                if (!result.success)
                  for (const issue of result.error.issues) {
                    const field = issue.path[0] as keyof InviteDto
                    if (!next[field]) next[field] = issue.message
                  }
                setErrors(next)
                if (result.success && !mutation.isPending) mutation.mutate(result.data)
              }}
            >
              <fieldset disabled={mutation.isPending} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    autoComplete="email"
                    value={values.email}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'invite-email-error' : undefined}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                  {errors.email && (
                    <p id="invite-email-error" className="text-sm text-destructive">
                      {errors.email}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select
                    value={values.role}
                    disabled={mutation.isPending}
                    onValueChange={(role) =>
                      setValues((current) => ({ ...current, role: role as InviteDto['role'] }))
                    }
                  >
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GUEST">Guest</SelectItem>
                      <SelectItem value="EDITOR">Editor</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Guest can read and comment. Editor can create content. Admin can manage users
                    and settings.
                  </p>
                </div>
              </fieldset>
              {mutation.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {apiErrorMessage(mutation.error)}
                </p>
              )}
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Sending invitation…' : 'Send invitation'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
