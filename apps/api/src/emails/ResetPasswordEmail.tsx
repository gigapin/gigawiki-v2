import React from 'react'

import { BaseLayout } from './layouts/BaseLayout.js'

const btn = {
  display: 'inline-block',
  backgroundColor: '#18181b',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: 'bold' as const,
  fontSize: '14px',
  marginTop: '24px',
}

export function ResetPasswordEmail({ name, resetUrl }: { name: string; resetUrl: string }) {
  return (
    <BaseLayout>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginTop: 0 }}>Reset your password</h1>
      <p>Hi {name}, we received a request to reset your GiGaWiki password.</p>
      <p style={{ color: '#71717a', fontSize: '13px' }}>This link expires in 1 hour.</p>
      <a href={resetUrl} style={btn}>
        Reset password
      </a>
      <p style={{ marginTop: '32px', fontSize: '13px', color: '#71717a' }}>
        If the button doesn&apos;t work, copy and paste this link into your browser:
        <br />
        <a href={resetUrl} style={{ color: '#18181b' }}>
          {resetUrl}
        </a>
      </p>
      <hr style={{ border: 'none', borderTop: '1px solid #e4e4e7', margin: '24px 0' }} />
      <p style={{ fontSize: '12px', color: '#71717a', margin: 0 }}>
        If you didn&apos;t request a password reset, you can safely ignore this email.
      </p>
    </BaseLayout>
  )
}
