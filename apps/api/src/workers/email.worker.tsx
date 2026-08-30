import { render } from '@react-email/render'
import { Worker } from 'bullmq'

import { InviteEmail } from '../emails/InviteEmail.js'
import { ResetPasswordEmail } from '../emails/ResetPasswordEmail.js'
import { VerifyEmailEmail } from '../emails/VerifyEmailEmail.js'
import { WelcomeEmail } from '../emails/WelcomeEmail.js'
import { sendMail } from '../lib/mailer.js'
import { redis } from '../lib/redis.js'

type EmailTemplate = 'welcome' | 'verify' | 'invite' | 'reset-password'

const SUBJECTS: Record<EmailTemplate, string> = {
  welcome: 'Welcome to GiGaWiki',
  verify: 'Verify your email',
  invite: "You've been invited to GiGaWiki",
  'reset-password': 'Reset your password',
}

export function startEmailWorker() {
  return new Worker(
    'email',
    async (job) => {
      const { to, template, data } = job.data as {
        to: string
        template: EmailTemplate
        data: Record<string, string>
      }

      let html: string

      switch (template) {
        case 'welcome':
          html = await render(<WelcomeEmail name={data.name} loginUrl={data.loginUrl} />)
          break
        case 'verify':
          html = await render(<VerifyEmailEmail name={data.name} verifyUrl={data.verifyUrl} />)
          break
        case 'invite':
          html = await render(
            <InviteEmail
              name={data.name}
              inviterName={data.inviterName}
              role={data.role}
              acceptUrl={data.acceptUrl}
              expiresAt={data.expiresAt}
            />,
          )
          break
        case 'reset-password':
          html = await render(<ResetPasswordEmail name={data.name} resetUrl={data.resetUrl} />)
          break
        default:
          throw new Error(`Unknown email template: ${template}`)
      }

      await sendMail({ to, subject: SUBJECTS[template], html })
    },
    { connection: redis },
  )
}
