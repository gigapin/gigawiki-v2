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

export function VerifyEmailEmail({ name, verifyUrl }: { name: string; verifyUrl: string }) {
  return (
    <BaseLayout>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginTop: 0 }}>
        Verify your email address
      </h1>
      <p>Hi {name}, please confirm your email address by clicking the button below.</p>
      <p style={{ color: '#71717a', fontSize: '13px' }}>This link expires in 24 hours.</p>
      <a href={verifyUrl} style={btn}>
        Verify email
      </a>
      <p style={{ marginTop: '32px', fontSize: '13px', color: '#71717a' }}>
        If the button doesn&apos;t work, copy and paste this link into your browser:
        <br />
        <a href={verifyUrl} style={{ color: '#18181b' }}>
          {verifyUrl}
        </a>
      </p>
    </BaseLayout>
  )
}
