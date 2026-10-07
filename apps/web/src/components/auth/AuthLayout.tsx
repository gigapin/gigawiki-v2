import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <Link
          to="/login"
          search={{ redirect: '' }}
          className="flex items-center justify-center gap-3 text-xl font-semibold"
        >
          <span
            className="grid size-10 place-items-center rounded-lg bg-primary text-2xl text-primary-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            G
          </span>
          GigaWiki
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </main>
  )
}
