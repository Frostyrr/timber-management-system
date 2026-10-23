import { useState } from 'react'
import {
  ShieldCheck,
  Lock,
  KeyRound,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  Fingerprint,
  FileCheck,
  AlertCircle,
  Database,
  Smartphone,
  Check,
} from 'lucide-react'
import { Heading } from '../components/layout'
import { Badge } from '../components/ui'

interface SecurityControl {
  id: string
  title: string
  description: string
  category: 'Identity' | 'Media' | 'Infrastructure' | 'Compliance'
  icon: typeof ShieldCheck
  enabled: boolean
  recommended: boolean
}

export function Security() {
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState('Moments ago')
  const [scanMessage, setScanMessage] = useState('')

  const [controls, setControls] = useState<SecurityControl[]>([
    {
      id: 'sso-domain',
      title: 'Restricted Google Workspace SSO',
      description: 'Enforce authentication exclusively through verified @timber.publication.edu domain accounts.',
      category: 'Identity',
      icon: KeyRound,
      enabled: true,
      recommended: true,
    },
    {
      id: 'sd-wipe',
      title: 'Mandatory SD Card Media Sanitization',
      description: 'Zero-trace formatting protocol on equipment check-in to safeguard confidential source footage and interviews.',
      category: 'Media',
      icon: HardDrive,
      enabled: true,
      recommended: true,
    },
    {
      id: 'two-factor',
      title: '2-Factor Authentication (2FA) Enforcement',
      description: 'Require hardware security keys (FIDO2) or authenticator app TOTP codes for all editorial staff accounts.',
      category: 'Identity',
      icon: Fingerprint,
      enabled: true,
      recommended: true,
    },
    {
      id: 'session-timeout',
      title: 'Editorial Lab Auto-Lockdown',
      description: 'Automatically terminate active sessions after 15 minutes of inactivity on shared newsroom lab workstations.',
      category: 'Infrastructure',
      icon: Lock,
      enabled: true,
      recommended: true,
    },
    {
      id: 'audit-immutable',
      title: 'Cryptographic Audit Log Verification',
      description: 'Hash-chain logging protocol ensuring equipment checkouts, condition changes, and returns cannot be altered.',
      category: 'Compliance',
      icon: FileCheck,
      enabled: true,
      recommended: true,
    },
    {
      id: 'off-hours-flag',
      title: 'Anomalous Off-Hours Checkout Alerts',
      description: 'Trigger immediate custodian notifications when equipment is checked out between 9:00 PM and 6:00 AM.',
      category: 'Infrastructure',
      icon: AlertCircle,
      enabled: true,
      recommended: false,
    },
    {
      id: 'media-vault',
      title: 'Encrypted Investigative Vault Backup',
      description: 'End-to-end AES-256 encrypted archival for raw footage transferred from returned memory cards.',
      category: 'Media',
      icon: Database,
      enabled: true,
      recommended: true,
    },
    {
      id: 'device-fleet',
      title: 'Hardware Serial Number Anti-Theft Tracking',
      description: 'Cross-reference university property registry tags with active campus network locations.',
      category: 'Compliance',
      icon: Smartphone,
      enabled: true,
      recommended: false,
    },
  ])

  const toggleControl = (id: string) => {
    setControls((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)),
    )
  }

  const handleRunScan = () => {
    setScanning(true)
    setScanMessage('Verifying certificates, token revocations, and media protocols…')
    setTimeout(() => {
      setScanning(false)
      setLastScan('Just now')
      setScanMessage('All 8 security perimeter checks passed with 0 vulnerabilities detected.')
      setTimeout(() => setScanMessage(''), 4500)
    }, 700)
  }

  const enabledCount = controls.filter((c) => c.enabled).length
  const postureScore = Math.round((enabledCount / controls.length) * 100)

  const recentAudits = [
    {
      id: 'aud-1',
      event: 'Google Workspace SSO Token Validation',
      detail: 'OAuth 2.0 PKCE session handshake verified for editorial staff',
      timestamp: '12 minutes ago',
      status: 'Passed',
      severity: 'Low',
    },
    {
      id: 'aud-2',
      event: 'SD Card Sanitization Check-in Protocol',
      detail: 'Memory wipe verified on Sony 64GB Extreme Pro (SD-04)',
      timestamp: '1 hour ago',
      status: 'Verified',
      severity: 'Low',
    },
    {
      id: 'aud-3',
      event: 'Shared Terminal Inactivity Sweep',
      detail: 'Terminated 2 idle sessions in Editorial Room Station B',
      timestamp: '3 hours ago',
      status: 'Enforced',
      severity: 'Medium',
    },
    {
      id: 'aud-4',
      event: 'Audit Trail Hash Integrity Verification',
      detail: 'Block-chain hash verified over 348 inventory activity records',
      timestamp: '6 hours ago',
      status: 'Passed',
      severity: 'Low',
    },
  ]

  return (
    <div className="flex flex-col gap-5 animate-enter">
      <Heading
        eyebrow="DATA & ASSET PROTECTION"
        title="Cybersecurity measures"
        description="Comprehensive security posture, identity guardrails, and media confidentiality controls for student publication assets."
      >
        <button
          type="button"
          onClick={handleRunScan}
          disabled={scanning}
          className="hero-btn-secondary inline-flex items-center gap-2"
          aria-label="Run security diagnostics scan"
        >
          <RefreshCw size={15} className={scanning ? 'animate-spin text-primary' : ''} />
          <span>{scanning ? 'Scanning defenses…' : 'Run diagnostic scan'}</span>
        </button>
      </Heading>

      {scanMessage && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-50/90 px-4 py-3 text-xs font-medium text-emerald-800 shadow-sm backdrop-blur-md animate-enter"
        >
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{scanMessage}</span>
        </div>
      )}

      {/* Security Health Score Banner */}
      <section
        className="rounded-[24px] border border-white/90 bg-white/85 p-5 shadow-[0_4px_20px_rgba(21,63,50,0.05)] backdrop-blur-xl sm:p-6"
        aria-label="Publication security score overview"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-primary border border-emerald-200/60 shadow-xs">
              <ShieldCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-semibold text-ink">Publication Security Posture</h2>
                <Badge>Grade A</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-ink">
                {enabledCount} of {controls.length} defense protocols active · Last diagnostic: {lastScan}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t border-line-subtle pt-3 sm:border-t-0 sm:pt-0">
            <div className="text-right">
              <span className="block text-[11px] font-medium tracking-[0.04em] text-muted-ink uppercase">
                Posture Score
              </span>
              <strong className="text-2xl font-bold tracking-tight text-primary">
                {postureScore}%
              </strong>
            </div>
            <div className="h-10 w-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ height: `${postureScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* 4 Metric Quick Badges */}
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-xl border border-line-subtle bg-surface/80 p-3">
            <span className="block text-[10.5px] font-medium text-muted-ink uppercase">2FA Adoption</span>
            <strong className="mt-0.5 block text-[15px] font-semibold text-ink">100%</strong>
            <span className="mt-0.5 block text-[10.5px] text-emerald-600 font-medium">All staff compliant</span>
          </div>

          <div className="rounded-xl border border-line-subtle bg-surface/80 p-3">
            <span className="block text-[10.5px] font-medium text-muted-ink uppercase">Media Sanitation</span>
            <strong className="mt-0.5 block text-[15px] font-semibold text-ink">Zero-Fill</strong>
            <span className="mt-0.5 block text-[10.5px] text-emerald-600 font-medium">Auto-wipe on return</span>
          </div>

          <div className="rounded-xl border border-line-subtle bg-surface/80 p-3">
            <span className="block text-[10.5px] font-medium text-muted-ink uppercase">Audit Trail</span>
            <strong className="mt-0.5 block text-[15px] font-semibold text-ink">Immutable</strong>
            <span className="mt-0.5 block text-[10.5px] text-emerald-600 font-medium">SHA-256 Signatures</span>
          </div>

          <div className="rounded-xl border border-line-subtle bg-surface/80 p-3">
            <span className="block text-[10.5px] font-medium text-muted-ink uppercase">Active Breaches</span>
            <strong className="mt-0.5 block text-[15px] font-semibold text-emerald-600">0 Reported</strong>
            <span className="mt-0.5 block text-[10.5px] text-muted-ink font-medium">Clean audit history</span>
          </div>
        </div>
      </section>

      {/* Main Grid: Security Controls (Left) + Audit Trail (Right) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Interactive Controls (2 Columns on large screens) */}
        <section
          className="flex flex-col gap-3 lg:col-span-2"
          aria-label="Active security controls"
        >
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[14px] font-semibold text-ink">Guardrail Controls & Policies</h3>
            <span className="text-xs text-muted-ink">Toggle to configure newsroom rules</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {controls.map((control) => {
              const Icon = control.icon
              return (
                <div
                  key={control.id}
                  className={`flex flex-col justify-between rounded-2xl border p-4 transition-all duration-150 ${
                    control.enabled
                      ? 'border-emerald-500/25 bg-white/95 shadow-xs'
                      : 'border-line-subtle bg-surface/70 opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          control.enabled
                            ? 'bg-emerald-50 text-primary border border-emerald-200/50'
                            : 'bg-slate-100 text-muted-ink'
                        }`}
                      >
                        <Icon size={18} />
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={control.enabled}
                        onClick={() => toggleControl(control.id)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          control.enabled ? 'bg-primary' : 'bg-slate-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            control.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <strong className="mt-3 block text-[13px] font-medium leading-snug text-ink">
                      {control.title}
                    </strong>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-muted-ink">
                      {control.description}
                    </p>
                  </div>

                  <div className="mt-3.5 flex items-center justify-between border-t border-line-subtle/80 pt-2.5 text-[11px]">
                    <span className="font-mono text-[10px] text-muted-ink uppercase">
                      {control.category}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        control.enabled ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {control.enabled ? (
                        <>
                          <Check size={12} />
                          Enforced
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

        {/* Audit Log Stream (1 Column on right) */}
        <section
          className="flex flex-col gap-3"
          aria-label="Security event audit trail"
        >
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[14px] font-semibold text-ink">Real-Time Security Logs</h3>
            <span className="text-xs text-muted-ink">Audited</span>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-white/90 bg-white/85 p-3.5 shadow-[0_4px_16px_rgba(21,63,50,0.03)] backdrop-blur-xl">
            {recentAudits.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-1 rounded-xl border border-line-subtle bg-surface/70 p-3 transition-colors hover:bg-canvas"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-medium text-ink truncate">
                    {item.event}
                  </span>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-primary border border-emerald-200/60">
                    {item.status}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-ink">{item.detail}</p>
                <span className="mt-0.5 text-[10px] text-muted-ink font-mono">{item.timestamp}</span>
              </div>
            ))}
          </div>

          {/* Guidelines Callout */}
          <div className="rounded-2xl border border-primary/20 bg-pale/70 p-3.5 text-ink">
            <strong className="block text-xs font-semibold text-primary">
              Student Publication Protocol
            </strong>
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted-ink">
              All memory cards, camera gear, and mobile audio setups must complete the zero-trace sanitization protocol before release to non-editorial contributors.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
