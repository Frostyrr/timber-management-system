import { useState, useEffect, useCallback } from 'react'
import {
  type SecurityState,
  type SecurityPolicy,
  loadSecurityState,
  saveSecurityState,
  notifySecurityStateChange,
  SECURITY_STATE_CHANGED_EVENT,
  getInitialSecurityState,
} from './security'

export function useSecuritySuite() {
  const [securityState, setSecurityState] = useState<SecurityState>(loadSecurityState)

  useEffect(() => {
    const handler = () => {
      setSecurityState(loadSecurityState())
    }
    window.addEventListener(SECURITY_STATE_CHANGED_EVENT, handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener(SECURITY_STATE_CHANGED_EVENT, handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  const update = useCallback((updater: (prev: SecurityState) => SecurityState) => {
    setSecurityState((current) => {
      const next = updater(current)
      saveSecurityState(next)
      notifySecurityStateChange()
      return next
    })
  }, [])

  const revokeSession = useCallback(
    (sessionId: string) => {
      update((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) =>
          s.id === sessionId ? { ...s, status: 'revoked' as const } : s,
        ),
      }))
    },
    [update],
  )

  const revokeAllOtherSessions = useCallback(() => {
    update((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) =>
        s.isCurrent ? s : { ...s, status: 'revoked' as const },
      ),
    }))
  }, [update])

  const resolveThreat = useCallback(
    (threatId: string, resolutionNote: string = 'Threat investigated and resolved by administrator.') => {
      update((prev) => ({
        ...prev,
        threats: prev.threats.map((t) =>
          t.id === threatId
            ? { ...t, status: 'resolved' as const, resolutionNote }
            : t,
        ),
      }))
    },
    [update],
  )

  const dismissThreat = useCallback(
    (threatId: string) => {
      update((prev) => ({
        ...prev,
        threats: prev.threats.map((t) =>
          t.id === threatId ? { ...t, status: 'dismissed' as const } : t,
        ),
      }))
    },
    [update],
  )

  const suspendAccount = useCallback(
    (
      userId: string,
      userName: string,
      userEmail: string,
      role: string,
      reason: string,
      adminName: string,
    ) => {
      update((prev) => {
        // Also revoke all active sessions for this suspended user
        const updatedSessions = prev.sessions.map((s) =>
          s.userId === userId ? { ...s, status: 'revoked' as const } : s,
        )

        const existingRecord = prev.suspensions.find((s) => s.userId === userId)
        const updatedSuspensions = existingRecord
          ? prev.suspensions.map((s) =>
              s.userId === userId
                ? {
                    ...s,
                    suspendedAt: new Date().toISOString(),
                    suspendedBy: adminName,
                    reason,
                  }
                : s,
            )
          : [
              {
                userId,
                userName,
                userEmail,
                role,
                suspendedAt: new Date().toISOString(),
                suspendedBy: adminName,
                reason,
                previousStatus: 'active' as const,
              },
              ...prev.suspensions,
            ]

        // Add a login failed record for the event stream
        const suspensionEvent = {
          id: `suspend-evt-${Date.now()}`,
          userId,
          userName,
          email: userEmail,
          timestamp: new Date().toISOString(),
          ip: '127.0.0.1 (System Console)',
          location: 'Cagayan de Oro, Philippines',
          device: 'Administrator Console',
          userAgent: 'Security Suite Enforcement Engine',
          status: 'failed' as const,
          failureReason: 'account_suspended' as const,
          isNewDevice: false,
          riskLevel: 'high' as const,
        }

        return {
          ...prev,
          sessions: updatedSessions,
          suspensions: updatedSuspensions,
          loginEvents: [suspensionEvent, ...prev.loginEvents],
        }
      })
    },
    [update],
  )

  const reactivateAccount = useCallback(
    (userId: string) => {
      update((prev) => ({
        ...prev,
        suspensions: prev.suspensions.filter((s) => s.userId !== userId),
      }))
    },
    [update],
  )

  const updatePolicy = useCallback(
    (patch: Partial<SecurityPolicy>) => {
      update((prev) => ({
        ...prev,
        policy: {
          ...prev.policy,
          ...patch,
        },
      }))
    },
    [update],
  )

  const addAuthorizedEmail = useCallback(
    (email: string, note: string, adminName: string) => {
      update((prev) => {
        const normalized = email.trim().toLowerCase()
        if (prev.policy.whitelistedEmails.some((w) => w.email.toLowerCase() === normalized)) {
          return prev
        }
        return {
          ...prev,
          policy: {
            ...prev.policy,
            whitelistedEmails: [
              ...prev.policy.whitelistedEmails,
              {
                email: normalized,
                addedBy: adminName,
                addedAt: new Date().toISOString(),
                note: note.trim() || 'Authorized external personnel',
              },
            ],
          },
        }
      })
    },
    [update],
  )

  const removeAuthorizedEmail = useCallback(
    (email: string) => {
      update((prev) => {
        const normalized = email.trim().toLowerCase()
        return {
          ...prev,
          policy: {
            ...prev.policy,
            whitelistedEmails: prev.policy.whitelistedEmails.filter(
              (w) => w.email.toLowerCase() !== normalized,
            ),
          },
        }
      })
    },
    [update],
  )

  const addAllowedDomain = useCallback(
    (domain: string) => {
      update((prev) => {
        const normalized = domain.trim().toLowerCase().replace(/^@/, '')
        if (!normalized || prev.policy.allowedDomains.includes(normalized)) {
          return prev
        }
        return {
          ...prev,
          policy: {
            ...prev.policy,
            allowedDomains: [...prev.policy.allowedDomains, normalized],
          },
        }
      })
    },
    [update],
  )

  const removeAllowedDomain = useCallback(
    (domain: string) => {
      update((prev) => ({
        ...prev,
        policy: {
          ...prev.policy,
          allowedDomains: prev.policy.allowedDomains.filter((d) => d !== domain),
        },
      }))
    },
    [update],
  )

  const resetToDefaults = useCallback(() => {
    const initial = getInitialSecurityState()
    saveSecurityState(initial)
    setSecurityState(initial)
    notifySecurityStateChange()
  }, [])

  return {
    securityState,
    revokeSession,
    revokeAllOtherSessions,
    resolveThreat,
    dismissThreat,
    suspendAccount,
    reactivateAccount,
    updatePolicy,
    addAuthorizedEmail,
    removeAuthorizedEmail,
    addAllowedDomain,
    removeAllowedDomain,
    resetToDefaults,
  }
}
