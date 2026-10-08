import { RegisterSchema } from '@shared/schemas/auth.schema'
import { isAxiosError } from 'axios'

export type RegistrationValues = {
  name: string
  email: string
  password: string
  confirmPassword: string
}
export type RegistrationErrors = Partial<Record<keyof RegistrationValues, string>>

export function validateRegistration(values: RegistrationValues): RegistrationErrors {
  const result = RegisterSchema.safeParse({
    ...values,
    name: values.name.trim(),
    email: values.email.trim(),
  })
  const errors: RegistrationErrors = {}
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof RegistrationValues
      if (!errors[field]) errors[field] = issue.message
    }
  }
  if (values.password.length > 128) errors.password = 'Use a password of at most 128 characters.'
  if (values.confirmPassword !== values.password) errors.confirmPassword = 'Passwords do not match.'
  return errors
}

export function accountCreatedWithoutEmail(error: unknown) {
  return (
    isAxiosError<{ code?: string }>(error) &&
    error.response?.data?.code === 'VERIFICATION_DELIVERY_FAILED'
  )
}
