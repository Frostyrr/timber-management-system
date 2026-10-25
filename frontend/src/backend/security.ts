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

const STORAGE_KEY = 'timberland_security_suite_state_v1'

export function getInitialSecurityState(): SecurityState {
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
      {
        id: 'sess-4',
        userId: 'dana-gales',
        userName: 'Dana Paula Gales',
        userEmail: 'dana.gales@thetimberland.pub',
        ip: '120.29.74.88',
        location: 'Cebu City, Philippines',
        device: 'iPad Pro 11" · iPadOS 17.4',
        browser: 'Mobile Safari 17.4',
        os: 'iPadOS 17.4',
        startedAt: daysAgo(1),
        lastActive: hoursAgo(3),
        isCurrent: false,
        status: 'active',
      },
      {
        id: 'sess-5-anomaly',
        userId: 'editor',
        userName: 'Ryan Ilagan',
        userEmail: 'ryan.ilagan@thetimberland.pub',
        ip: '185.220.101.5',
        location: 'Frankfurt, Germany (Tor Exit Node)',
        device: 'Unknown Linux Device · Firefox 120',
        browser: 'Firefox 120.0',
        os: 'Linux x86_64',
        startedAt: minsAgo(24),
        lastActive: minsAgo(15),
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
        email: 'hacker_bot@tempmail.org',
        timestamp: minsAgo(18),
        ip: '45.154.255.89',
        location: 'Moscow, Russia',
        device: 'Python Requests Client',
        userAgent: 'python-requests/2.31.0',
        status: 'failed',
        failureReason: 'unauthorized_domain',
        isNewDevice: true,
        riskLevel: 'high',
      },
      {
        id: 'login-05',
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
      {
        id: 'login-06',
        email: 'former.staffer@thetimberland.pub',
        timestamp: hoursAgo(8),
        ip: '119.95.210.14',
        location: 'Davao City, Philippines',
        device: 'Android 14 · Samsung Galaxy S23',
        userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/123.0.0.0 Mobile Safari/537.36',
        status: 'failed',
        failureReason: 'account_suspended',
        isNewDevice: false,
        riskLevel: 'medium',
      },
      {
        id: 'login-07',
        userId: 'dana-gales',
        userName: 'Dana Paula Gales',
        email: 'dana.gales@thetimberland.pub',
        timestamp: daysAgo(1),
        ip: '120.29.74.88',
        location: 'Cebu City, Philippines',
        device: 'iPad Pro · iPadOS 17',
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
        status: 'success',
        isNewDevice: true,
        riskLevel: 'low',
      },
      {
        id: 'login-08',
        email: 'test_brute_force@thetimberland.pub',
        timestamp: minsAgo(40),
        ip: '103.245.236.1',
        location: 'Hanoi, Vietnam',
        device: 'Automated Script · Curl',
        userAgent: 'curl/8.4.0',
        status: 'failed',
        failureReason: 'rate_limited',
        isNewDevice: true,
        riskLevel: 'high',
      },
    ],
    threats: [
      {
        id: 'threat-01',
        type: 'impossible_travel',
        severity: 'critical',
        title: 'Impossible Geolocation Travel Detected',
        description:
          'Account "Ryan Ilagan" authenticated from Cagayan de Oro, Philippines (112.198.114.42), followed by a session initiation from Frankfurt, Germany (185.220.101.5) 15 minutes later. Geographically impossible velocity indicates session hijacking or credential exposure.',
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
          'Multiple login attempts originating from unauthorized consumer domains (@gmail.com, @tempmail.org) were blocked at the perimeter gate from Eastern European proxy nodes.',
        targetEmail: 'unknown.intruder@gmail.com',
        ip: '194.26.29.112',
        location: 'Bucharest, Romania',
        timestamp: hoursAgo(1),
        status: 'active',
      },
      {
        id: 'threat-03',
        type: 'new_device_login',
        severity: 'medium',
        title: 'Unrecognized Device Fingerprint Authenticated',
        description:
          'A new device fingerprint (Linux x86_64, Firefox 120) with no previous trust history successfully negotiated a session token for newsroom editorial staff.',
        targetEmail: 'ryan.ilagan@thetimberland.pub',
        ip: '185.220.101.5',
        location: 'Frankfurt, Germany',
        timestamp: minsAgo(25),
        status: 'active',
      },
      {
        id: 'threat-04',
        type: 'account_lockout',
        severity: 'medium',
        title: 'Automated Throttling Triggered for Suspended Account',
        description:
          'Access attempts against suspended account "former.staffer@thetimberland.pub" triggered rate limiting after multiple authorization denials.',
        targetEmail: 'former.staffer@thetimberland.pub',
        ip: '119.95.210.14',
        location: 'Davao City, Philippines',
        timestamp: hoursAgo(8),
        status: 'resolved',
        resolutionNote: 'Account already quarantined; IP added to automated 24hr cooldown queue.',
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
        {
          email: 'pico.coordinator@gmail.com',
          addedBy: 'Marc Elson Rebato',
          addedAt: daysAgo(5),
          note: 'Public Information and Communications Office liaison',
        },
      ],
      sessionTimeoutMinutes: 720, // 12 hours
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

export function loadSecurityState(): SecurityState {
  if (typeof window === 'undefined') return getInitialSecurityState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const initial = getInitialSecurityState()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
      return initial
    }
    return JSON.parse(raw) as SecurityState
  } catch {
    return getInitialSecurityState()
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
