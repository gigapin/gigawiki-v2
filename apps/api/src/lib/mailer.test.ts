import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  sendMail: vi.fn().mockResolvedValue(undefined),
  createTransport: vi.fn(),
  env: {
    NODE_ENV: 'development',
    SMTP_HOST: 'sandbox.smtp.mailtrap.io',
    SMTP_PORT: 2525,
    SMTP_USER: 'test-user',
    SMTP_PASS: 'test-password',
    SMTP_FROM: 'noreply@example.com',
    SMTP_FROM_NAME: 'GigaWiki',
  },
}))
vi.mock('nodemailer', () => ({
  default: {
    createTransport: mocks.createTransport.mockImplementation(() => ({ sendMail: mocks.sendMail })),
  },
}))
vi.mock('../config/env.js', () => ({ env: mocks.env }))

import { sendMail } from './mailer.js'

describe('Mailtrap SMTP transport', () => {
  it('uses the configured credentials and STARTTLS-capable port', () => {
    expect(mocks.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: mocks.env.SMTP_HOST,
        port: 2525,
        secure: false,
        auth: { user: mocks.env.SMTP_USER, pass: mocks.env.SMTP_PASS },
      }),
    )
  })
  it('sends the rendered message with the configured sender', async () => {
    await sendMail({ to: 'alice@example.com', subject: 'Verify your email', html: '<p>Verify</p>' })
    expect(mocks.sendMail).toHaveBeenCalledWith({
      from: { name: 'GigaWiki', address: 'noreply@example.com' },
      to: 'alice@example.com',
      subject: 'Verify your email',
      html: '<p>Verify</p>',
    })
  })
})
