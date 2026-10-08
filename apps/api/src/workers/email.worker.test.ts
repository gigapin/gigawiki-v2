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
