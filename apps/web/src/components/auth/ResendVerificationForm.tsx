import { useState } from 'react'

import { useResendVerification } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiErrorMessage } from '@/lib/api-error'

export function ResendVerificationForm({ initialEmail = '' }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail)
  const mutation = useResendVerification()
  return (
    <form
      className="space-y-3 border-t pt-5"
      onSubmit={(event) => {
        event.preventDefault()
        if (!mutation.isPending) mutation.mutate(email.trim().toLowerCase())
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="resend-email">Email address</Label>
        <Input
          id="resend-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          disabled={mutation.isPending}
          onChange={(event) => {
            setEmail(event.target.value)
            mutation.reset()
          }}
        />
      </div>
      {mutation.isSuccess && (
        <p role="status" className="text-sm text-primary">
          {mutation.data.message}
        </p>
      )}
      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {apiErrorMessage(mutation.error)}
        </p>
      )}
      <Button
        type="submit"
        variant="outline"
        className="w-full"
        disabled={!email.trim() || mutation.isPending}
      >
        {mutation.isPending ? 'Sending…' : 'Resend verification email'}
      </Button>
    </form>
  )
}
