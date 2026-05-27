import React from 'react'

const styles = {
  body: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f4f4f5',
    margin: 0,
    padding: 0,
  },
  wrapper: {
    maxWidth: '600px',
    margin: '40px auto',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    backgroundColor: '#18181b',
    padding: '24px 32px',
  },
  logo: {
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: 'bold' as const,
    letterSpacing: '-0.5px',
    textDecoration: 'none',
  },
  content: {
    padding: '32px',
    color: '#27272a',
    lineHeight: '1.6',
  },
  footer: {
    backgroundColor: '#f4f4f5',
    padding: '16px 32px',
    textAlign: 'center' as const,
    color: '#71717a',
    fontSize: '12px',
    lineHeight: '1.5',
  },
}

export function BaseLayout({
  children,
  siteName = 'GiGaWiki',
}: {
  children: React.ReactNode
  siteName?: string
}) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{siteName}</title>
      </head>
      <body style={styles.body}>
        <div style={styles.wrapper}>
          <div style={styles.header}>
            <span style={styles.logo}>{siteName}</span>
          </div>
          <div style={styles.content}>{children}</div>
          <div style={styles.footer}>
            <p style={{ margin: 0 }}>
              © {new Date().getFullYear()} {siteName}. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
