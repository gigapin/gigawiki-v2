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

export function WelcomeEmail({ name, loginUrl }: { name: string; loginUrl: string }) {
  return (
    <BaseLayout>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginTop: 0 }}>
        Welcome to GiGaWiki, {name}!
      </h1>
      <p>Your account is ready. Start building your knowledge base by logging in.</p>
      <a href={loginUrl} style={btn}>
        Log in to GiGaWiki
      </a>
      <p style={{ marginTop: '32px', fontSize: '13px', color: '#71717a' }}>
        If the button doesn&apos;t work, copy and paste this link into your browser:
        <br />
        <a href={loginUrl} style={{ color: '#18181b' }}>
          {loginUrl}
        </a>
      </p>
    </BaseLayout>
  )
}
