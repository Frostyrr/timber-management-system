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
import { client, fetchSecuritySnapshot, mutateSecurity } from './client'

export function useSecuritySuite() {
  const [securityState, setSecurityState] = useState<SecurityState>(loadSecurityState)
  const [loading, setLoading] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const syncFromBackend = useCallback(async () => {
    if (!client) return
    try {
      setLoading(true)
      const data = await fetchSecuritySnapshot()
      if (data && typeof data === 'object') {
        setSecurityState(data)
        saveSecurityState(data)
        notifySecurityStateChange()
        setIsLive(true)
        setSyncError(null)
      }
    } catch (err) {
      console.warn('Backend security sync note (using cached/optimistic state):', err)
      setSyncError(
        err instanceof Error
          ? err.message
          : 'Unable to synchronize security telemetry with database.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    const handler = () => {
      setSecurityState(loadSecurityState())
    }
    window.addEventListener(SECURITY_STATE_CHANGED_EVENT, handler)
    window.addEventListener('storage', handler)

    if (client) {
      void fetchSecuritySnapshot()
        .then((data) => {
          if (active && data && typeof data === 'object') {
            setSecurityState(data)
            saveSecurityState(data)
            notifySecurityStateChange()
            setIsLive(true)
            setSyncError(null)
          }
        })
        .catch((err) => {
          console.warn('Backend security sync note (using cached state):', err)
        })
    }

    return () => {
      active = false
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

  const runRemoteMutation = useCallback(
    async (mutationPayload: unknown) => {
      if (!client) return
      try {
        await mutateSecurity(mutationPayload)
        await syncFromBackend()
      } catch (err) {
        console.warn('Database security mutation notification:', err)
      }
    },
    [syncFromBackend],
  )

  const revokeSession = useCallback(
    (sessionId: string) => {
      update((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) =>
          s.id === sessionId ? { ...s, status: 'revoked' as const } : s,
        ),
      }))
      void runRemoteMutation({ type: 'revoke-session', sessionId })
    },
    [update, runRemoteMutation],
  )

  const revokeAllOtherSessions = useCallback(() => {
    let currentId = 'sess-current'
    update((prev) => {
      const cur = prev.sessions.find((s) => s.isCurrent)
      if (cur) currentId = cur.id
      return {
        ...prev,
        sessions: prev.sessions.map((s) =>
          s.isCurrent ? s : { ...s, status: 'revoked' as const },
        ),
      }
    })
    void runRemoteMutation({ type: 'revoke-all-other-sessions', currentSessionId: currentId })
  }, [update, runRemoteMutation])

  const resolveThreat = useCallback(
    (
      threatId: string,
      resolutionNote: string = 'Threat investigated and resolved by administrator.',
    ) => {
      update((prev) => ({
        ...prev,
        threats: prev.threats.map((t) =>
          t.id === threatId
            ? { ...t, status: 'resolved' as const, resolutionNote }
            : t,
        ),
      }))
      void runRemoteMutation({ type: 'resolve-threat', threatId, resolutionNote })
    },
    [update, runRemoteMutation],
  )

  const dismissThreat = useCallback(
    (threatId: string) => {
      update((prev) => ({
        ...prev,
        threats: prev.threats.map((t) =>
          t.id === threatId ? { ...t, status: 'dismissed' as const } : t,
        ),
      }))
      void runRemoteMutation({ type: 'dismiss-threat', threatId })
    },
    [update, runRemoteMutation],
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
      void runRemoteMutation({
        type: 'suspend-account',
        userId,
        userName,
        userEmail,
        role,
        reason,
      })
    },
    [update, runRemoteMutation],
  )

  const reactivateAccount = useCallback(
    (userId: string) => {
      update((prev) => ({
        ...prev,
        suspensions: prev.suspensions.filter((s) => s.userId !== userId),
      }))
      void runRemoteMutation({ type: 'reactivate-account', userId })
    },
    [update, runRemoteMutation],
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
      void runRemoteMutation({ type: 'update-policy', patch })
    },
    [update, runRemoteMutation],
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
      void runRemoteMutation({ type: 'add-authorized-email', email, note })
    },
    [update, runRemoteMutation],
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
      void runRemoteMutation({ type: 'remove-authorized-email', email })
    },
    [update, runRemoteMutation],
  )

  const addAllowedDomain = useCallback(
    (domain: string) => {
      const normalized = domain.trim().toLowerCase().replace(/^@/, '')
      if (!normalized) return

      update((prev) => {
        if (prev.policy.allowedDomains.includes(normalized)) {
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
      void runRemoteMutation({ type: 'add-allowed-domain', domain: normalized })
    },
    [update, runRemoteMutation],
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
      void runRemoteMutation({ type: 'remove-allowed-domain', domain })
    },
    [update, runRemoteMutation],
  )

  const resetToDefaults = useCallback(() => {
    const initial = getInitialSecurityState()
    saveSecurityState(initial)
    setSecurityState(initial)
    notifySecurityStateChange()
  }, [])

  return {
    securityState,
    loading,
    isLive,
    syncError,
    syncFromBackend,
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
