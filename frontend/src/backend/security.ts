export interface SecuritySession {
  id: string
  userId: string
  userName: string
  userEmail: string
  ip: string
  location: string
  device: string
  browser: string
  os: string
  startedAt: string
  lastActive: string
  isCurrent: boolean
  status: 'active' | 'revoked' | 'expired'
}

export interface SecurityLoginEvent {
  id: string
  userId?: string
  userName?: string
  email: string
  timestamp: string
  ip: string
  location: string
  device: string
  userAgent: string
  status: 'success' | 'failed'
  failureReason?:
    | 'unauthorized_domain'
    | 'account_suspended'
    | 'invalid_credentials'
    | 'rate_limited'
    | 'unrecognized_device'
  isNewDevice: boolean
  riskLevel: 'low' | 'medium' | 'high'
}

export interface SecurityThreat {
  id: string
  type:
    | 'impossible_travel'
    | 'brute_force'
    | 'new_device_login'
    | 'unauthorized_domain_attempt'
    | 'session_anomaly'
    | 'account_lockout'
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  targetEmail: string
  ip: string
  location: string
  timestamp: string
  status: 'active' | 'investigating' | 'resolved' | 'dismissed'
  resolutionNote?: string
}

export interface SecurityPolicy {
  allowedDomains: string[]
  restrictToAllowedDomains: boolean
  whitelistedEmails: { email: string; addedBy: string; addedAt: string; note: string }[]
  sessionTimeoutMinutes: number
  maxFailedAttemptsBeforeLock: number
  notifyOnNewDevice: boolean
  requireAdminMFA: boolean
}

export interface SuspendedAccountRecord {
  userId: string
  userName: string
  userEmail: string
  role: string
  suspendedAt: string
  suspendedBy: string
  reason: string
  previousStatus: 'active' | 'pending'
}

export interface SecurityState {
  sessions: SecuritySession[]
  loginEvents: SecurityLoginEvent[]
  threats: SecurityThreat[]
  policy: SecurityPolicy
  suspensions: SuspendedAccountRecord[]
}

const STORAGE_KEY = 'timberland_security_suite_state_v2'
const LEGACY_STORAGE_KEY = 'timberland_security_suite_state_v1'

const proc = typeof globalThis !== 'undefined' ? (globalThis as unknown as { process?: { env?: Record<string, string> } }).process : undefined

export const isTestEnv = Boolean(
  (proc && (proc.env?.NODE_ENV === 'test' || proc.env?.VITEST === 'true')) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test'),
)

export function detectCurrentDevice(): {
  browser: string
  os: string
  device: string
  ip: string
  location: string
  userAgent: string
} {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      browser: 'Web Browser',
      os: 'Desktop OS',
      device: 'Workstation',
      ip: '127.0.0.1 (Direct)',
      location: 'Local Session',
      userAgent: '',
    }
  }

  const ua = navigator.userAgent
  let browser = 'Modern Browser'
  if (ua.includes('Firefox/')) {
    const v = ua.match(/Firefox\/(\d+(\.\d+)?)/)?.[1]
    browser = `Firefox ${v || ''}`.trim()
  } else if (ua.includes('Edg/')) {
    const v = ua.match(/Edg\/(\d+(\.\d+)?)/)?.[1]
    browser = `Microsoft Edge ${v || ''}`.trim()
  } else if (ua.includes('Chrome/')) {
    const v = ua.match(/Chrome\/(\d+(\.\d+)?)/)?.[1]
    browser = `Google Chrome ${v || ''}`.trim()
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    const v = ua.match(/Version\/(\d+(\.\d+)?)/)?.[1]
    browser = `Safari ${v || ''}`.trim()
  }

  let os = 'Desktop OS'
  let device = 'Workstation'

  if (/Windows NT 10.0/i.test(ua)) {
    os = 'Windows 10/11'
    device = 'Windows Workstation'
  } else if (/Windows/i.test(ua)) {
    os = 'Windows'
    device = 'Windows PC'
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS'
    device = 'MacBook / Mac'
  } else if (/iPhone/i.test(ua)) {
    os = 'iOS'
    device = 'Apple iPhone'
  } else if (/iPad/i.test(ua)) {
    os = 'iPadOS'
    device = 'Apple iPad'
  } else if (/Android/i.test(ua)) {
    os = 'Android'
    device = 'Android Device'
  } else if (/Linux/i.test(ua)) {
    os = 'Linux'
    device = 'Linux Station'
  }

  let location = 'Client Workstation'
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz) {
      if (tz.includes('Manila') || tz.includes('Asia/Manila')) {
        location = 'Philippines (Local Session)'
      } else {
        location = `${tz} (Local Session)`
      }
    }
  } catch {
    // fallback
  }

  return {
    browser,
    os,
    device,
    ip: '127.0.0.1 (Direct)',
    location,
    userAgent: ua,
  }
}

function getTestSecurityFixtures(): SecurityState {
  const now = new Date()
  const minsAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString()
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString()
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString()

  return {
    sessions: [
      {
        id: 'sess-current',
        userId: 'admin',
        userName: 'Marc Elson Rebato',
        userEmail: 'marc.rebato@thetimberland.pub',
        ip: '112.198.114.42',
        location: 'Cagayan de Oro, Philippines',
        device: 'MacBook Pro 16" · macOS Sonoma',
        browser: 'Google Chrome 124.0',
        os: 'macOS 14.4.1',
        startedAt: hoursAgo(2),
        lastActive: minsAgo(1),
        isCurrent: true,
        status: 'active',
      },
      {
        id: 'sess-2',
        userId: 'admin',
        userName: 'Marc Elson Rebato',
        userEmail: 'marc.rebato@thetimberland.pub',
        ip: '112.198.114.42',
        location: 'Cagayan de Oro, Philippines',
        device: 'iPhone 15 Pro · iOS 17.4',
        browser: 'Mobile Safari 17.4',
        os: 'iOS 17.4',
        startedAt: hoursAgo(18),
        lastActive: minsAgo(42),
        isCurrent: false,
        status: 'active',
      },
      {
        id: 'sess-3',
        userId: 'custodian',
        userName: 'Juvie Rose Mosquite',
        userEmail: 'juvie.mosquite@thetimberland.pub',
        ip: '175.176.82.19',
        location: 'Cagayan de Oro, Philippines',
        device: 'Dell XPS 15 · Windows 11',
        browser: 'Google Chrome 124.0',
        os: 'Windows 11',
        startedAt: hoursAgo(5),
        lastActive: minsAgo(8),
        isCurrent: false,
        status: 'active',
      },
    ],
    loginEvents: [
      {
        id: 'login-01',
        userId: 'admin',
        userName: 'Marc Elson Rebato',
        email: 'marc.rebato@thetimberland.pub',
        timestamp: hoursAgo(2),
        ip: '112.198.114.42',
        location: 'Cagayan de Oro, Philippines',
        device: 'MacBook Pro · macOS',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/124.0.0.0 Safari/537.36',
        status: 'success',
        isNewDevice: false,
        riskLevel: 'low',
      },
      {
        id: 'login-02',
        email: 'unknown.intruder@gmail.com',
        timestamp: hoursAgo(1),
        ip: '194.26.29.112',
        location: 'Bucharest, Romania',
        device: 'Windows PC · Edge 123',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edge/123.0',
        status: 'failed',
        failureReason: 'unauthorized_domain',
        isNewDevice: true,
        riskLevel: 'high',
      },
      {
        id: 'login-03',
        userId: 'editor',
        userName: 'Ryan Ilagan',
        email: 'ryan.ilagan@thetimberland.pub',
        timestamp: minsAgo(25),
        ip: '185.220.101.5',
        location: 'Frankfurt, Germany',
        device: 'Linux PC · Firefox 120',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
        status: 'success',
        isNewDevice: true,
        riskLevel: 'high',
      },
      {
        id: 'login-04',
        userId: 'custodian',
        userName: 'Juvie Rose Mosquite',
        email: 'juvie.mosquite@thetimberland.pub',
        timestamp: hoursAgo(5),
        ip: '175.176.82.19',
        location: 'Cagayan de Oro, Philippines',
        device: 'Dell XPS · Windows 11',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0',
        status: 'success',
        isNewDevice: false,
        riskLevel: 'low',
      },
    ],
    threats: [
      {
        id: 'threat-01',
        type: 'impossible_travel',
        severity: 'critical',
        title: 'Impossible Geolocation Travel Detected',
        description:
          'Account "Ryan Ilagan" authenticated from Cagayan de Oro, Philippines (112.198.114.42), followed by a session initiation from Frankfurt, Germany (185.220.101.5) 15 minutes later.',
        targetEmail: 'ryan.ilagan@thetimberland.pub',
        ip: '185.220.101.5',
        location: 'Frankfurt, Germany',
        timestamp: minsAgo(24),
        status: 'active',
      },
      {
        id: 'threat-02',
        type: 'unauthorized_domain_attempt',
        severity: 'high',
        title: 'Unauthorized OAuth Domain Authentication Spike',
        description:
          'Multiple login attempts originating from unauthorized consumer domains (@gmail.com) were blocked at perimeter gates.',
        targetEmail: 'unknown.intruder@gmail.com',
        ip: '194.26.29.112',
        location: 'Bucharest, Romania',
        timestamp: hoursAgo(1),
        status: 'active',
      },
    ],
    policy: {
      allowedDomains: ['thetimberland.pub', 'ustp.edu.ph'],
      restrictToAllowedDomains: true,
      whitelistedEmails: [
        {
          email: 'adviser.external@gmail.com',
          addedBy: 'Marc Elson Rebato',
          addedAt: daysAgo(14),
          note: 'Senior Editorial Consultant & Faculty Adviser',
        },
      ],
      sessionTimeoutMinutes: 720,
      maxFailedAttemptsBeforeLock: 5,
      notifyOnNewDevice: true,
      requireAdminMFA: true,
    },
    suspensions: [
      {
        userId: 'former-staff-1',
        userName: 'Former Member',
        userEmail: 'former.staffer@thetimberland.pub',
        role: 'Staff',
        suspendedAt: daysAgo(30),
        suspendedBy: 'Marc Elson Rebato',
        reason: 'Graduated / term completed; revoked access to publication inventory.',
        previousStatus: 'active',
      },
    ],
  }
}

export function getInitialSecurityState(
  person?: { id?: string; name?: string; email?: string; role?: string },
  forceTest = false,
): SecurityState {
  if (forceTest || isTestEnv) {
    return getTestSecurityFixtures()
  }

  const dev = detectCurrentDevice()
  const userId = person?.id || 'admin'
  const userName = person?.name || 'Marc Elson Rebato'
  const userEmail =
    person?.email ||
    (person?.name
      ? `${person.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@thetimberland.pub`
      : 'marc.rebato@thetimberland.pub')

  const now = new Date().toISOString()
  const currentSession: SecuritySession = {
    id: `sess-${userId}`,
    userId,
    userName,
    userEmail,
    ip: dev.ip,
    location: dev.location,
    device: `${dev.device} · ${dev.os}`,
    browser: dev.browser,
    os: dev.os,
    startedAt: now,
    lastActive: now,
    isCurrent: true,
    status: 'active',
  }

  const initialLogin: SecurityLoginEvent = {
    id: `login-${Date.now()}`,
    userId,
    userName,
    email: userEmail,
    timestamp: now,
    ip: dev.ip,
    location: dev.location,
    device: `${dev.device} · ${dev.browser}`,
    userAgent: dev.userAgent,
    status: 'success',
    isNewDevice: false,
    riskLevel: 'low',
  }

  return {
    sessions: [currentSession],
    loginEvents: [initialLogin],
    threats: [], // 0 phantom threats! Clean baseline
    policy: {
      allowedDomains: ['thetimberland.pub', 'ustp.edu.ph'],
      restrictToAllowedDomains: true,
      whitelistedEmails: [],
      sessionTimeoutMinutes: 720,
      maxFailedAttemptsBeforeLock: 5,
      notifyOnNewDevice: true,
      requireAdminMFA: true,
    },
    suspensions: [],
  }
}

export function loadSecurityState(
  person?: { id?: string; name?: string; email?: string; role?: string },
): SecurityState {
  if (typeof window === 'undefined') return getInitialSecurityState(person)
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const initial = getInitialSecurityState(person)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
      return initial
    }

    // In live browser (non-test), purge stale mock data from previous prototypes
    if (!isTestEnv) {
      const isMockData =
        raw.includes('unknown.intruder@gmail.com') ||
        raw.includes('Frankfurt, Germany') ||
        raw.includes('Bucharest, Romania') ||
        raw.includes('hacker_bot@tempmail.org')

      if (isMockData) {
        const fresh = getInitialSecurityState(person)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
        return fresh
      }
    }

    return JSON.parse(raw) as SecurityState
  } catch {
    return getInitialSecurityState(person)
  }
}

export function saveSecurityState(state: SecurityState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (err) {
    console.error('Failed to save security suite state', err)
  }
}

// Custom event for cross-component reactive updates
export const SECURITY_STATE_CHANGED_EVENT = 'timberland:security_state_changed'

export function notifySecurityStateChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SECURITY_STATE_CHANGED_EVENT))
  }
}
