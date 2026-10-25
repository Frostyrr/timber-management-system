import { useState } from 'react'
import {
  Globe2,
  Mail,
  ShieldCheck,
  Plus,
  Trash2,
  Sliders,
} from 'lucide-react'
import { Heading } from '../../components/layout/Heading'
import { useSecuritySuite } from '../../backend/useSecuritySuite'
import { useInventory } from '../../backend/context'
import { Modal } from '../../components/ui/Modal'
import { Field } from '../../components/ui/Field'
import { Select } from '../../components/ui/Select'
import { dateText } from '../../components/format'

export function SecurityPolicies() {
  const { person } = useInventory()
  const {
    securityState,
    updatePolicy,
    addAllowedDomain,
    removeAllowedDomain,
    addAuthorizedEmail,
    removeAuthorizedEmail,
  } = useSecuritySuite()

  const policy = securityState.policy

  const [newDomain, setNewDomain] = useState('')
  const [addingEmailModal, setAddingEmailModal] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [emailNote, setEmailNote] = useState('')

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDomain.trim()) return
    addAllowedDomain(newDomain)
    setNewDomain('')
  }

  const handleAddEmailSubmit = async () => {
    if (!emailInput.trim()) return
    addAuthorizedEmail(emailInput, emailNote, person.name)
    setEmailInput('')
    setEmailNote('')
    setAddingEmailModal(false)
  }

  return (
    <div className="space-y-6">
      <Heading
        eyebrow="ACCESS CONTROL & PERIMETER GOVERNANCE"
        title="Authorized email restrictions & policies"
        description="Configure institutional Google Workspace domain restrictions, individual authorized email whitelists, and session timeout parameters."
      />

      {/* Main Grid: Domain Guardrails & Session Rules */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Institutional Domain Guardrails */}
        <section className="panel p-5 sm:p-6 space-y-5">
          <div className="flex items-start justify-between border-b border-line-subtle pb-4">
            <div>
              <h2 className="text-base font-semibold text-ink flex items-center gap-2">
                <Globe2 size={18} className="text-primary" />
                <span>Authorized Domain Restrictions</span>
              </h2>
              <p className="text-xs text-muted-ink mt-0.5">
                Block authentication requests from public or unverified email providers.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={policy.restrictToAllowedDomains}
                onChange={(e) => updatePolicy({ restrictToAllowedDomains: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-line-subtle"></div>
            </label>
          </div>

          <div className="rounded-xl bg-surface/60 p-3.5 text-xs text-ink space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck
                size={16}
                className={policy.restrictToAllowedDomains ? 'text-emerald-700' : 'text-muted-ink'}
              />
              <span>
                Domain Guard:{' '}
                {policy.restrictToAllowedDomains ? (
                  <span className="text-emerald-700">Strict Enforcement Active</span>
                ) : (
                  <span className="text-amber-700">Permissive (Warning Only)</span>
                )}
              </span>
            </div>
            <p className="text-muted-ink leading-relaxed">
              When strict enforcement is active, only accounts with exact matching domain suffixes or individually whitelisted emails can sign in. Consumer domains (@gmail.com, @yahoo.com) are rejected before database queries execute.
            </p>
          </div>

          {/* List of Allowed Domains */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted-ink uppercase tracking-wider block">
              Configured Institutional Domains
            </label>

            <div className="space-y-2">
              {policy.allowedDomains.map((dom) => (
                <div
                  key={dom}
                  className="flex items-center justify-between rounded-xl border border-line-subtle bg-white px-3.5 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2 font-mono font-medium text-ink">
                    <span className="text-muted-ink">@</span>
                    <span>{dom}</span>
                  </div>

                  {policy.allowedDomains.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeAllowedDomain(dom)}
                      className="rounded-lg p-1 text-muted-ink hover:text-red-600 hover:bg-red-50 transition"
                      title="Remove domain restriction"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : (
                    <span className="text-[10px] text-muted-ink">Primary</span>
                  )}
                </div>
              ))}
            </div>

            {/* Add Domain Form */}
            <form onSubmit={handleAddDomain} className="flex gap-2 pt-1">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-ink font-mono text-xs">
                  @
                </span>
                <input
                  type="text"
                  placeholder="e.g. publication.university.edu"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-xs rounded-xl border border-line-subtle font-mono"
                />
              </div>
              <button
                type="submit"
                className="secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Add Domain</span>
              </button>
            </form>
          </div>
        </section>

        {/* Inactivity & Lockout Thresholds */}
        <section className="panel p-5 sm:p-6 space-y-5">
          <div className="border-b border-line-subtle pb-4">
            <h2 className="text-base font-semibold text-ink flex items-center gap-2">
              <Sliders size={18} className="text-primary" />
              <span>Session Duration & Brute-Force Rules</span>
            </h2>
            <p className="text-xs text-muted-ink mt-0.5">
              Automated safeguards against credential stuffing and orphaned active sessions.
            </p>
          </div>

          <div className="space-y-4">
            {/* Session Inactivity Timeout */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink block">
                Session Idle Inactivity Lifetime
              </label>
              <Select
                value={String(policy.sessionTimeoutMinutes)}
                onChange={(e) =>
                  updatePolicy({ sessionTimeoutMinutes: Number(e.target.value) })
                }
                options={[
                  { value: '240', label: '4 Hours (High Security / Shared Newsroom Workstations)' },
                  { value: '480', label: '8 Hours (Standard Single Work Shift)' },
                  { value: '720', label: '12 Hours (Recommended Publication Default)' },
                  { value: '1440', label: '24 Hours (Editorial Leads / Remote Reporting)' },
                  { value: '10080', label: '7 Days (Extended Persistent Mobile Sessions)' },
                ]}
              />
              <p className="text-[11px] text-muted-ink">
                Sessions exceeding this idle duration are invalidated, requiring re-authentication.
              </p>
            </div>

            {/* Failed Attempts Lockout Threshold */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink block">
                Brute-Force Lockout Threshold
              </label>
              <Select
                value={String(policy.maxFailedAttemptsBeforeLock)}
                onChange={(e) =>
                  updatePolicy({ maxFailedAttemptsBeforeLock: Number(e.target.value) })
                }
                options={[
                  { value: '3', label: '3 Failed Attempts (Aggressive Threshold)' },
                  { value: '5', label: '5 Failed Attempts (Standard Recommended)' },
                  { value: '10', label: '10 Failed Attempts (Permissive)' },
                ]}
              />
              <p className="text-[11px] text-muted-ink">
                Consecutive failed attempts from a single IP initiate a temporary 15-minute perimeter cooldown.
              </p>
            </div>

            {/* Checkbox Toggles */}
            <div className="pt-2 space-y-3 border-t border-line-subtle">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.notifyOnNewDevice}
                  onChange={(e) => updatePolicy({ notifyOnNewDevice: e.target.checked })}
                  className="mt-0.5 rounded border-line text-primary focus:ring-primary h-4 w-4"
                />
                <div className="text-xs">
                  <span className="font-semibold text-ink block">
                    Flag New Hardware Signatures
                  </span>
                  <span className="text-muted-ink">
                    Automatically trigger security anomaly alerts whenever an account authenticates from an unrecognized browser/device.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.requireAdminMFA}
                  onChange={(e) => updatePolicy({ requireAdminMFA: e.target.checked })}
                  className="mt-0.5 rounded border-line text-primary focus:ring-primary h-4 w-4"
                />
                <div className="text-xs">
                  <span className="font-semibold text-ink block">
                    Enforce Multi-Factor Authentication (MFA) on Administrators
                  </span>
                  <span className="text-muted-ink">
                    Require 2-step verification for all accounts holding Administrator or Inventory Custodian roles.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </section>
      </div>

      {/* Individual Authorized Email Whitelist */}
      <section className="panel p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line-subtle pb-4">
          <div>
            <h2 className="text-base font-semibold text-ink flex items-center gap-2">
              <Mail size={18} className="text-primary" />
              <span>Individually Authorized Email Allowlist</span>
            </h2>
            <p className="text-xs text-muted-ink mt-0.5">
              Specific non-institutional accounts explicitly authorized to access the system (e.g. external advisers, campus coordinators).
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAddingEmailModal(true)}
            className="primary text-xs px-3.5 py-2 flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus size={14} />
            <span>Authorize Email</span>
          </button>
        </div>

        {/* Whitelist Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line-subtle text-[11px] font-semibold text-muted-ink uppercase tracking-wider">
                <th className="py-3 px-3">Authorized Email</th>
                <th className="py-3 px-3">Purpose / Justification</th>
                <th className="py-3 px-3">Authorized By</th>
                <th className="py-3 px-3">Date Added</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle text-xs">
              {policy.whitelistedEmails.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-ink">
                    No individual email exceptions configured. All users must belong to authorized domains.
                  </td>
                </tr>
              ) : (
                policy.whitelistedEmails.map((item) => (
                  <tr key={item.email} className="hover:bg-surface/50 transition">
                    <td className="py-3 px-3 font-mono text-ink font-semibold">
                      {item.email}
                    </td>
                    <td className="py-3 px-3 text-muted-ink">
                      {item.note}
                    </td>
                    <td className="py-3 px-3 text-ink font-medium">
                      {item.addedBy}
                    </td>
                    <td className="py-3 px-3 font-mono text-muted-ink text-[11px]">
                      {dateText(item.addedAt)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeAuthorizedEmail(item.email)}
                        className="rounded-lg p-1 text-muted-ink hover:text-red-600 hover:bg-red-50 transition"
                        title="Revoke email authorization"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add Email Modal */}
      {addingEmailModal && (
        <Modal
          title="Authorize Individual Email"
          onClose={() => setAddingEmailModal(false)}
          onSubmit={handleAddEmailSubmit}
          submit="Grant authorization"
        >
          <div className="space-y-4">
            <Field label="Google Account Email">
              <input
                type="email"
                placeholder="e.g. adviser.external@gmail.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                className="w-full text-xs rounded-xl border border-line-subtle p-2.5 font-mono"
              />
            </Field>

            <Field label="Authorization Purpose / Note">
              <input
                type="text"
                placeholder="e.g. External Photography Mentor or PICO Media Specialist"
                value={emailNote}
                onChange={(e) => setEmailNote(e.target.value)}
                required
                className="w-full text-xs rounded-xl border border-line-subtle p-2.5"
              />
            </Field>

            <p className="hint">
              This email will bypass the strict domain filter. Role permissions still need to be assigned via System Access.
            </p>
          </div>
        </Modal>
      )}
    </div>
  )
}
