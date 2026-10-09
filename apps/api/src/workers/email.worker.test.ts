import { beforeEach, describe, expect, it, vi } from 'vitest'

import { sendMail } from '../lib/mailer.js'

import { deliverEmail } from './email.worker.js'

vi.mock('../lib/mailer.js', () => ({ sendMail: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../lib/redis.js', () => ({ redis: {} }))
beforeEach(() => vi.clearAllMocks())

describe('Verification email delivery', () => {
  it('renders the verification link and passes it to the SMTP mailer', async () => {
    const verifyUrl = 'http://localhost:5173/verify-email?token=verification-test'
    await deliverEmail({
      data: { to: 'alice@example.com', template: 'verify', data: { name: 'Alice', verifyUrl } },
    })
    expect(sendMail).toHaveBeenCalledWith({
      to: 'alice@example.com',
      subject: 'Verify your email',
      html: expect.stringContaining(verifyUrl),
    })
    const email = vi.mocked(sendMail).mock.calls[0][0].html
    expect(email.replace(/<!--.*?-->/g, '')).toContain('Hi Alice')
    expect(email).toContain('Verify email')
  })
  it('refuses to send a verification email without a working link', async () => {
    await expect(
      deliverEmail({
        data: { to: 'alice@example.com', template: 'verify', data: { name: 'Alice' } },
      }),
    ).rejects.toThrow('Missing verification URL')
    expect(sendMail).not.toHaveBeenCalled()
  })
})

it.each([
  ['reset-password', 'resetUrl', '/reset-password?token=reset', 'Reset your password'],
  ['invite', 'acceptUrl', '/accept-invite?token=invite', "You've been invited to GiGaWiki"],
] as const)(
  'renders the %s email with the correct frontend link',
  async (template, field, path, subject) => {
    const url = `http://localhost:5173${path}`
    await deliverEmail({
      data: {
        to: 'alice@example.com',
        template,
        data: {
          name: 'Alice',
          inviterName: 'Admin',
          role: 'EDITOR',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          [field]: url,
        },
      },
    })
    expect(sendMail).toHaveBeenCalledWith({
      to: 'alice@example.com',
      subject,
      html: expect.stringContaining(url),
    })
  },
)
