import { useState } from 'react'

import { useParityAction } from '@/api/parity'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiErrorMessage } from '@/lib/api-error'

export function ProvisionAccount() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('GUEST')
  const [attest, setAttest] = useState(false)
  const mutation = useParityAction<{ temporaryPassword: string; expiresAt: string }>('/users')
  if (!open)
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Create account without email
      </Button>
    )
  return (
    <section className="space-y-3 rounded border p-4">
      <h2 className="text-xl">Create account without email</h2>
      {mutation.data ? (
        <div className="space-y-3" role="status">
          <p>
            Copy this temporary password now and deliver it outside the app. It will not be shown
            again.
          </p>
          <output className="block select-all break-all rounded bg-muted p-3 font-mono">
            {mutation.data.temporaryPassword}
          </output>
          <p>
            Expires {new Date(mutation.data.expiresAt).toLocaleString()}. Password change required
            before accessing content.
          </p>
          <Button
            onClick={() => {
              mutation.reset()
              setOpen(false)
              setName('')
              setEmail('')
              setAttest(false)
            }}
          >
            I saved the password
          </Button>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate({ name, email, role, attestEmail: attest })
          }}
        >
          <label>
            Name
            <Input
              aria-label="Account name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Email
            <Input
              aria-label="Account email"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Role
            <select
              aria-label="Account role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option>GUEST</option>
              <option>EDITOR</option>
              <option>ADMIN</option>
            </select>
          </label>
          <label className="flex gap-2">
            <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} />
            I attest this email belongs to the account owner and will deliver the temporary password
            securely.
          </label>
          {mutation.isError && <p role="alert">{apiErrorMessage(mutation.error)}</p>}
          <Button disabled={!attest || mutation.isPending}>Create account</Button>
          <Button
            variant="outline"
            type="button"
            disabled={mutation.isPending}
            onClick={() => {
              mutation.reset()
              setOpen(false)
            }}
          >
            Cancel
          </Button>
        </form>
      )}
    </section>
  )
}

export function ReissuePassword({ id }: { id: string }) {
  const mutation = useParityAction<{ temporaryPassword: string; expiresAt: string }>(
    `/users/${id}/temporary-password`,
  )
  const [confirm, setConfirm] = useState(false)
  return (
    <div>
      {!confirm ? (
        <Button variant="outline" onClick={() => setConfirm(true)}>
          Reissue temporary password
        </Button>
      ) : mutation.data ? (
        <div role="status">
          <p>Copy once; previous credentials are revoked:</p>
          <output className="select-all font-mono">{mutation.data.temporaryPassword}</output>
          <Button
            onClick={() => {
              mutation.reset()
              setConfirm(false)
            }}
          >
            I saved it
          </Button>
        </div>
      ) : (
        <>
          <p>Invalidate previous temporary credentials?</p>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate({})}>
            Confirm reissue
          </Button>
          <Button variant="outline" disabled={mutation.isPending} onClick={() => setConfirm(false)}>
            Cancel
          </Button>
        </>
      )}
      {mutation.isError && <p role="alert">{apiErrorMessage(mutation.error)}</p>}
    </div>
  )
}
