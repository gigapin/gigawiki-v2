import { isAxiosError } from 'axios'

export function apiErrorMessage(error: unknown): string {
  if (isAxiosError<{ error?: string | { message?: string } }>(error)) {
    const detail = error.response?.data?.error
    if (typeof detail === 'string') return detail
    return detail?.message ?? 'Unable to reach the server. Please try again.'
  }
  return 'Something went wrong. Please try again.'
}
