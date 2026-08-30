import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const RegisterSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
})

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
})

export const InviteSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'EDITOR', 'GUEST']).default('GUEST'),
})

export type LoginDto = z.infer<typeof LoginSchema>
export type RegisterDto = z.infer<typeof RegisterSchema>
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>
export type InviteDto = z.infer<typeof InviteSchema>
