import type { State } from './model'
export type MfaSummary = {
  title: string
  records: string[]
  consequence: string
  destructive: boolean
}
export function summarizeMfaAction(payload: unknown, state?: State): MfaSummary {
  const action = (payload && typeof payload === 'object' ? payload : {}) as {
    type?: string
    id?: string
    userId?: string
    targetType?: string
    targets?: string[]
    role?: string
    status?: string
    email?: string
    domain?: string
    patch?: Record<string, unknown>
  }
  const describe = (id: string) => {
    const item = state?.items.find((i) => i.id === id)
    if (item) return `${item.name} · ${item.tag}`
    const person =
      state?.people?.find((p) => p.id === id) ?? state?.profiles.find((p) => p.id === id)
    return person?.name ?? `Record ${id}`
  }
  const ids = action.targets ?? (action.id ? [action.id] : action.userId ? [action.userId] : [])
  const destructive = ['purge-archive', 'purge-all-archives', 'delete-profile'].includes(
    action.type ?? '',
  )
  const names: Record<string, string> = {
    'purge-archive': 'Permanently delete this record',
    'purge-all-archives': `Permanently delete ${ids.length} archived records`,
    'delete-profile': 'Delete account access',
    membership: 'Change account access',
    'suspend-account': 'Suspend account access',
    'reactivate-account': 'Restore account access',
    'update-policy': 'Update security settings',
    'revoke-session': 'Revoke session',
    'revoke-all-other-sessions': 'Revoke other sessions',
    'resolve-threat': 'Resolve security alert',
    'dismiss-threat': 'Dismiss security alert',
    'add-allowed-domain': 'Allow an email domain',
    'remove-allowed-domain': 'Remove an allowed domain',
    'add-authorized-email': 'Authorize an email address',
    'remove-authorized-email': 'Remove an authorized email address',
  }
  return {
    title: names[action.type ?? ''] ?? 'Confirm security change',
    records: [...ids.map(describe), ...[action.email, action.domain].filter((value): value is string => !!value)],
    destructive,
    consequence: action.type?.startsWith('purge')
      ? 'These records and their linked history will be permanently deleted. This cannot be undone.'
      : action.type === 'membership'
        ? `Access will change to ${action.role ?? 'the selected role'} (${action.status ?? 'the selected status'}).`
        : 'This change takes effect after you verify with your authenticator.',
  }
}
