import { useState } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  Fingerprint,
  AlertTriangle,
  Zap,
  Ban,
  Activity,
  Globe,
  Check,
  Clock3,
} from 'lucide-react'
import { Heading } from '../components/layout'
import { Badge } from '../components/ui'

interface AuthPolicy {
  id: string
  title: string
  description: string
  category: 'Brute-Force' | 'Identity' | 'Session' | 'Network'
  icon: typeof ShieldCheck
  enabled: boolean
  metric: string
}

export function Security() {
  const [scanning, setScanning] = useState(false)
  const [lastCheck, setLastCheck] = useState('Moments ago')
  const [statusNotice, setStatusNotice] = useState('')
  const [blockedCount, setBlockedCount] = useState(47)

  const [policies, setPolicies] = useState<AuthPolicy[]>([
    {
      id: 'brute-force',
      title: 'Adaptive Brute-Force Rate Limiting',
      description: 'Exponential backoff delays after 3 failed attempts; automatic 60-minute IP ban on 5 consecutive invalid tries.',
      category: 'Brute-Force',
      icon: Zap,
      enabled: true,
      metric: '47 attacks mitigated',
    },
    {
      id: 'domain-restriction',
      title: 'Strict Google Workspace SSO Domain',
      description: 'Require verified @timber.publication.edu credentials. Instantly reject unapproved personal consumer Gmail accounts.',
      category: 'Identity',
      icon: KeyRound,
      enabled: true,
      metric: '100% domain match',
    },
    {
      id: 'session-concurrency',
      title: 'Single-Session Lab Enforcement',
      description: 'Terminate prior workstation logins when a staff member signs in on a new newsroom terminal to prevent credential sharing.',
      category: 'Session',
      icon: Lock,
      enabled: true,
      metric: '1 session per editor',
    },
    {
      id: 'geo-anomaly',
      title: 'Impossible Travel & Geo-Anomaly Shield',
      description: 'Flag and block logins originating from conflicting geographic zones within unrealistic travel windows.',
      category: 'Network',
      icon: Globe,
      enabled: true,
      metric: 'Geo-velocity check active',
    },
    {
      id: 'token-binding',
      title: 'Session Token Binding & Anti-Replay',
      description: 'Bind OAuth 2.0 PKCE bearer tokens to client browser fingerprints to block stolen session cookie replays.',
      category: 'Identity',
      icon: Fingerprint,
      enabled: true,
      metric: '0 hijack attempts',
    },
    {
      id: 'idle-revocation',
      title: 'Workstation Inactivity Auto-Revocation',
      description: 'Automatically invalidate bearer tokens and flush browser storage after 30 minutes of idle terminal time.',
      category: 'Session',
      icon: Clock3,
      enabled: true,
      metric: '30-minute timeout',
    },
  ])

  const [threatLogs, setThreatLogs] = useState([
    {
      id: 'log-1',
      event: 'Blocked Brute-Force Attack Wave',
      ip: '198.51.100.42',
      detail: '8 rapid password/credential-stuffing hits within 4 seconds. Rate-limiter triggered.',
      timestamp: '4 minutes ago',
      outcome: 'Auto-Banned 60m',
      severity: 'high',
    },
    {
      id: 'log-2',
      event: 'Google SSO Authentication Verified',
      ip: '10.24.112.5 (Campus WiFi)',
      detail: 'OAuth 2.0 PKCE handshake succeeded for editor Marc (Editor-in-Chief).',
      timestamp: '18 minutes ago',
      outcome: 'Authenticated',
      severity: 'safe',
    },
    {
      id: 'log-3',
      event: 'Consumer Gmail Login Rejected',
      ip: '172.56.21.89',
      detail: 'Rejected login attempt with non-organization email (alex.writer@gmail.com).',
      timestamp: '42 minutes ago',
      outcome: 'Domain Blocked',
      severity: 'medium',
    },
    {
      id: 'log-4',
      event: 'Progressive Backoff Delay Applied',
      ip: '203.0.113.19',
      detail: '3 consecutive invalid sign-ins. Injected 4,000ms delay to deter script automation.',
      timestamp: '1 hour ago',
      outcome: 'Throttled',
      severity: 'medium',
    },
    {
      id: 'log-5',
      event: 'Stale Session Token Auto-Revoked',
      ip: 'Editorial Station #3',
      detail: 'Revoked dormant session after 30 minutes of inactive newsroom terminal presence.',
      timestamp: '2 hours ago',
      outcome: 'Session Purged',
      severity: 'safe',
    },
  ])

  const togglePolicy = (id: string) => {
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)),
    )
  }

  const handleRunDiagnostics = () => {
    setScanning(true)
    setStatusNotice('Testing auth gateway: simulating 50 concurrent brute-force hits across token endpoints…')
    setTimeout(() => {
      setScanning(false)
      setLastCheck('Just now')
      setBlockedCount((prev) => prev + 3)
      setStatusNotice('Simulated attack blocked successfully! Rate limiting held at 0.04ms average response time.')
      setThreatLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          event: 'Simulated Probe Throttled',
          ip: '127.0.0.1 (Self-Test)',
          detail: 'Synthetic brute-force penetration probe blocked by adaptive rate limiter.',
          timestamp: 'Just now',
          outcome: 'Blocked',
          severity: 'high',
        },
        ...prev.slice(0, 4),
      ])
      setTimeout(() => setStatusNotice(''), 5000)
    }, 650)
  }

  const activePoliciesCount = policies.filter((p) => p.enabled).length
  const authHealthScore = Math.round((activePoliciesCount / policies.length) * 100)

  return (
    <div className="flex flex-col gap-5 animate-enter">
      <Heading
        eyebrow="IDENTITY & ACCESS DEFENSE"
        title="Authentication security"
        description="Real-time brute-force mitigation, credential defense telemetry, Google Workspace SSO domain enforcement, and session integrity."
      >
        <button
          type="button"
          onClick={handleRunDiagnostics}
          disabled={scanning}
          className="hero-btn-secondary inline-flex items-center gap-2"
          aria-label="Run brute-force and gateway health check"
        >
          <RefreshCw size={15} className={scanning ? 'animate-spin text-primary' : ''} />
          <span>{scanning ? 'Testing gateway defense…' : 'Test brute-force defense'}</span>
        </button>
      </Heading>

      {statusNotice && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-50/90 px-4 py-3 text-xs font-medium text-emerald-800 shadow-sm backdrop-blur-md animate-enter"
        >
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Primary Authentication Defense Posture Banner */}
      <section
        className="rounded-[24px] border border-white/90 bg-white/85 p-5 shadow-[0_4px_20px_rgba(21,63,50,0.05)] backdrop-blur-xl sm:p-6"
        aria-label="Authentication security posture overview"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-primary border border-emerald-200/60 shadow-xs">
              <ShieldCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-semibold text-ink">Authentication Gateway Shield</h2>
                <Badge>Operational · Enforced</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-ink">
                All {activePoliciesCount} defensive rules active · Real-time throttling enabled · Tested {lastCheck}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t border-line-subtle pt-3 sm:border-t-0 sm:pt-0">
            <div className="text-right">
              <span className="block text-[11px] font-medium tracking-[0.04em] text-muted-ink uppercase">
                Auth Defense Score
              </span>
              <strong className="text-2xl font-bold tracking-tight text-primary">
                {authHealthScore}%
              </strong>
            </div>
            <div className="h-10 w-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ height: `${authHealthScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* 4 Core Auth & Brute-Force Telemetry Metrics */}
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-xl border border-line-subtle bg-surface/80 p-3">
            <div className="flex items-center justify-between text-muted-ink">
              <span className="text-[10.5px] font-medium uppercase tracking-[0.02em]">Brute-Force Blocked</span>
              <Ban size={14} className="text-amber-600" />
            </div>
            <strong className="mt-1 block text-xl font-bold text-ink">{blockedCount}</strong>
            <span className="mt-0.5 block text-[10.5px] text-emerald-600 font-medium">100% Mitigated (24h)</span>
          </div>

          <div className="rounded-xl border border-line-subtle bg-surface/80 p-3">
            <div className="flex items-center justify-between text-muted-ink">
              <span className="text-[10.5px] font-medium uppercase tracking-[0.02em]">Failed Login Rate</span>
              <Activity size={14} className="text-primary" />
            </div>
            <strong className="mt-1 block text-xl font-bold text-ink">0.8%</strong>
            <span className="mt-0.5 block text-[10.5px] text-muted-ink font-medium">Normal baseline &lt; 2.5%</span>
          </div>

          <div className="rounded-xl border border-line-subtle bg-surface/80 p-3">
            <div className="flex items-center justify-between text-muted-ink">
              <span className="text-[10.5px] font-medium uppercase tracking-[0.02em]">Active OAuth Tokens</span>
              <KeyRound size={14} className="text-primary" />
            </div>
            <strong className="mt-1 block text-xl font-bold text-ink">6 Validated</strong>
            <span className="mt-0.5 block text-[10.5px] text-emerald-600 font-medium">PKCE handshake verified</span>
          </div>

          <div className="rounded-xl border border-line-subtle bg-surface/80 p-3">
            <div className="flex items-center justify-between text-muted-ink">
              <span className="text-[10.5px] font-medium uppercase tracking-[0.02em]">Domain Enforcement</span>
              <Globe size={14} className="text-primary" />
            </div>
            <strong className="mt-1 block text-xl font-bold text-emerald-600">Strict</strong>
            <span className="mt-0.5 block text-[10.5px] text-muted-ink font-medium">@timber.publication.edu</span>
          </div>
        </div>

        {/* Attack Vector Distribution Bar */}
        <div className="mt-5 border-t border-line-subtle pt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-ink">Mitigated Attack Vectors (Past 24 Hours)</span>
            <span className="text-muted-ink text-[11px] font-mono">Total probes: {blockedCount}</span>
          </div>

          <div className="mt-2.5 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              title="Dictionary & Credential Stuffing (68%)"
              className="bg-amber-600 h-full transition-all"
              style={{ width: '68%' }}
            />
            <div
              title="Unauthorized Consumer Accounts (24%)"
              className="bg-primary h-full transition-all"
              style={{ width: '24%' }}
            />
            <div
              title="Replay & Stale Token Probes (8%)"
              className="bg-supporting h-full transition-all"
              style={{ width: '8%' }}
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-muted-ink">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-600" />
              <span>Credential Stuffing (68%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span>Consumer Gmail Blocks (24%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-supporting" />
              <span>Token Replays (8%)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Two-Column View: Guardrail Policies (Left) + Live Threat Stream (Right) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Interactive Authentication Policies */}
        <section
          className="flex flex-col gap-3 lg:col-span-2"
          aria-label="Active authentication defense policies"
        >
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[14px] font-semibold text-ink">Authentication Guardrail Policies</h3>
            <span className="text-xs text-muted-ink">Configurable protection parameters</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {policies.map((policy) => {
              const Icon = policy.icon
              return (
                <div
                  key={policy.id}
                  className={`flex flex-col justify-between rounded-2xl border p-4 transition-all duration-150 ${
                    policy.enabled
                      ? 'border-emerald-500/25 bg-white/95 shadow-xs'
                      : 'border-line-subtle bg-surface/70 opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          policy.enabled
                            ? 'bg-emerald-50 text-primary border border-emerald-200/50'
                            : 'bg-slate-100 text-muted-ink'
                        }`}
                      >
                        <Icon size={18} />
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={policy.enabled}
                        onClick={() => togglePolicy(policy.id)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          policy.enabled ? 'bg-primary' : 'bg-slate-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            policy.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <strong className="mt-3 block text-[13px] font-medium leading-snug text-ink">
                      {policy.title}
                    </strong>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-muted-ink">
                      {policy.description}
                    </p>
                  </div>

                  <div className="mt-3.5 flex items-center justify-between border-t border-line-subtle/80 pt-2.5 text-[11px]">
                    <span className="font-mono text-[10px] text-muted-ink uppercase">
                      {policy.category}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        policy.enabled ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {policy.enabled ? (
                        <>
                          <Check size={12} />
                          {policy.metric}
                        </>
                      ) : (
                        'Disabled'
                      )}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Live Authentication Threat Stream */}
        <section
          className="flex flex-col gap-3"
          aria-label="Real-time authentication threat logs"
        >
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[14px] font-semibold text-ink">Live Auth Threat Feed</h3>
            <span className="text-xs text-muted-ink font-mono">Stream Active</span>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-white/90 bg-white/85 p-3.5 shadow-[0_4px_16px_rgba(21,63,50,0.03)] backdrop-blur-xl">
            {threatLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-1 rounded-xl border border-line-subtle bg-surface/70 p-3 transition-colors hover:bg-canvas"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-medium text-ink truncate flex items-center gap-1.5">
                    {log.severity === 'high' ? (
                      <ShieldAlert size={14} className="text-amber-600 shrink-0" />
                    ) : log.severity === 'medium' ? (
                      <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                    ) : (
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    )}
                    {log.event}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                      log.severity === 'high'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : log.severity === 'medium'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {log.outcome}
                  </span>
                </div>
                <p className="text-[11.5px] leading-relaxed text-muted-ink">{log.detail}</p>
                <div className="mt-1 flex items-center justify-between text-[10px] text-muted-ink font-mono">
                  <span>Source: {log.ip}</span>
                  <span>{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Notice Card */}
          <div className="rounded-2xl border border-primary/20 bg-pale/70 p-3.5 text-ink">
            <strong className="block text-xs font-semibold text-primary">
              Brute-Force Mitigation Policy
            </strong>
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted-ink">
              Any IP exceeding 5 consecutive failed authorization requests is placed in a 60-minute quarantine. Multi-factor challenge is automatically invoked for unexpected client fingerprints.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
