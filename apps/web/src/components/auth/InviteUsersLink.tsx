import { Link } from '@tanstack/react-router'
import { UserPlus } from 'lucide-react'

import { useAuthStore } from '@/stores/auth.store'

export function InviteUsersLink({ onClick }: { onClick?: () => void }) {
  const user = useAuthStore((s) => s.user)
  if (user?.role !== 'ADMIN') return null
  return (
    <Link
      to="/settings/invites"
      onClick={onClick}
      className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <UserPlus className="size-4" />
      Invite users
    </Link>
  )
}
