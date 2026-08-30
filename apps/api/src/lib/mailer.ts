import nodemailer from 'nodemailer'

import { env } from '../config/env.js'

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
})

export async function sendMail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  if (env.NODE_ENV === 'test') {
    console.log(`[mailer] would send to ${to}: ${subject}`)
    return
  }
  await transporter.sendMail({
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM}>`,
    to,
    subject,
    html,
  })
}
