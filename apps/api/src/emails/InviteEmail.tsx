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

export function InviteEmail({
  name,
  inviterName,
  role,
  acceptUrl,
  expiresAt,
}: {
  name: string
  inviterName: string
  role: string
  acceptUrl: string
  expiresAt: string
}) {
  return (
    <BaseLayout>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginTop: 0 }}>
        You&apos;ve been invited to GiGaWiki
      </h1>
      <p>
        Hi {name}, <strong>{inviterName}</strong> has invited you to join GiGaWiki as{' '}
        <strong>{role}</strong>.
      </p>
      <p style={{ color: '#71717a', fontSize: '13px' }}>This invitation expires on {expiresAt}.</p>
      <a href={acceptUrl} style={btn}>
        Accept invitation
      </a>
      <p style={{ marginTop: '32px', fontSize: '13px', color: '#71717a' }}>
        If the button doesn&apos;t work, copy and paste this link into your browser:
        <br />
        <a href={acceptUrl} style={{ color: '#18181b' }}>
          {acceptUrl}
        </a>
      </p>
    </BaseLayout>
  )
}
