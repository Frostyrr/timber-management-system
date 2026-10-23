import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Package,
} from 'lucide-react'
import { useDemo } from '../demo/context'
import { canInventory } from '../demo/model'
import { Heading, Avatar } from '../components/layout'
import { GoogleIcon } from '../components/auth'
import { Modal } from '../components/ui'

export function Settings() {
  const { state, person, switchPerson } = useDemo()
  const navigate = useNavigate()
  const manager = canInventory(person)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [googleLinked, setGoogleLinked] = useState(true)
  const [savingNotice, setSavingNotice] = useState('')

  // Check if person has unreturned equipment in their care
  const activeLoans = state.loans.filter((l) => l.borrowerId === person.id && !l.returned)
  const hasActiveLoans = activeLoans.length > 0

  const userEmail = `${person.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@timber.publication.edu`

  const handleToggleGoogle = () => {
    setGoogleLinked(!googleLinked)
    setSavingNotice(
      !googleLinked
        ? 'Google Workspace SSO account connected.'
        : 'Google Workspace account unlinked.',
    )
    setTimeout(() => setSavingNotice(''), 3000)
  }

  const handleDeleteAccount = () => {
    if (confirmName.trim().toLowerCase() !== person.name.trim().toLowerCase()) return

    // Find another profile to fall back to if available
    const remaining = state.profiles.filter((p) => p.id !== person.id)
    const fallbackId = remaining[0]?.id ?? 'admin'

    setDeleteModalOpen(false)
    switchPerson(fallbackId)
    navigate('/login')
  }

  return (
    <div className="flex flex-col gap-6">
      <Heading
        eyebrow="ACCOUNT & SECURITY"
        title="Account settings"
        description="Manage your editorial identity, Google Workspace SSO link, and account permissions."
      >
        <Link to="/" className="secondary">
          Back to overview
        </Link>
      </Heading>

      {savingNotice && (
        <div className="flex items-center gap-2 rounded-2xl border border-[#cde0d2] bg-pale px-4 py-3 text-xs font-medium text-primary shadow-xs">
          <CheckCircle2 size={16} />
          <span>{savingNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Profile Card & Google SSO */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          {/* Profile Overview Card */}
          <section className="panel" aria-labelledby="profile-heading">
            <div className="panel-heading">
              <div>
                <h2 id="profile-heading">Editorial Profile</h2>
                <p className="muted">Your verified student publication newsroom identity</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-white/90 bg-white/85 p-5">
              <div className="flex items-center gap-4">
                <Avatar name={person.name} />
                <div className="min-w-0 flex-1">
                  <strong className="block text-[15px] font-medium text-ink">{person.name}</strong>
                  <span className="block text-xs text-muted-ink">{person.role}</span>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#cde0d2] bg-pale px-2.5 py-1 text-[11px] font-medium text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Active Newsroom Staff
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-line-subtle pt-4 sm:grid-cols-2">
                <div>
                  <span className="block text-[11px] font-medium text-muted-ink uppercase">
                    Institutional Email
                  </span>
                  <span className="mt-0.5 block font-mono text-xs text-ink">{userEmail}</span>
                </div>
                <div>
                  <span className="block text-[11px] font-medium text-muted-ink uppercase">
                    Inventory Authority
                  </span>
                  <span className="mt-0.5 block text-xs font-medium text-ink">
                    {manager ? 'Custodian / Authorized Manager' : 'Staff Member / Equipment Borrower'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Google Workspace SSO Card */}
          <section className="panel" aria-labelledby="google-heading">
            <div className="panel-heading">
              <div>
                <h2 id="google-heading">Google Workspace Authentication</h2>
                <p className="muted">Single sign-on connection for institutional verification</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-white/90 bg-white/85 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-surface shadow-xs">
                    <GoogleIcon size={20} />
                  </span>
                  <div>
                    <strong className="block text-[13.5px] font-medium text-ink">
                      Google Single Sign-On
                    </strong>
                    <span className="block text-xs text-muted-ink">
                      {googleLinked ? `Connected as ${userEmail}` : 'Not currently linked'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleGoogle}
                  className={`action-pill ${googleLinked ? '' : 'primary-pill'}`}
                >
                  {googleLinked ? 'Unlink account' : 'Connect Google SSO'}
                </button>
              </div>

              <div className="rounded-xl border border-line-subtle bg-surface/60 p-3 text-xs text-muted-ink">
                <span>OAuth 2.0 PKCE client integration active. Scopes: </span>
                <code className="font-mono text-[10.5px] text-primary">openid</code>,{' '}
                <code className="font-mono text-[10.5px] text-primary">email</code>,{' '}
                <code className="font-mono text-[10.5px] text-primary">profile</code>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Danger Zone Card */}
        <div className="flex flex-col gap-5">
          <section className="panel border-danger-border/60 bg-danger-bg/25" aria-labelledby="danger-heading">
            <div className="panel-heading border-b-0 pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-danger-text" />
                <h2 id="danger-heading" className="text-danger-text font-medium">
                  Danger Zone
                </h2>
              </div>
            </div>

            <p className="mb-4 text-xs leading-[1.5] text-muted-ink">
              Irreversible account operations. Deactivating your profile revokes equipment release privileges.
            </p>

            <div className="flex flex-col gap-3 rounded-2xl border border-danger-border/80 bg-white/90 p-4 shadow-xs">
              <div>
                <strong className="block text-[13px] font-medium text-ink">Delete account</strong>
                <p className="mt-1 text-[11.5px] leading-[1.4] text-muted-ink">
                  Permanently remove this newsroom account. All historical transactions will remain logged under your name.
                </p>
              </div>

              {hasActiveLoans && (
                <div className="flex items-start gap-2 rounded-xl border border-warning-border bg-warning-bg p-3 text-[11.5px] text-warning-text">
                  <Package size={15} className="shrink-0 mt-0.5" />
                  <span>
                    Cannot delete: You have <strong>{activeLoans.length}</strong> active item(s) in your care. Please return all equipment first.
                  </span>
                </div>
              )}

              <button
                type="button"
                disabled={hasActiveLoans}
                onClick={() => setDeleteModalOpen(true)}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-danger-border bg-danger-bg px-4 py-2.5 text-xs font-medium text-danger-text transition-all duration-150 hover:bg-danger-text hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={14} />
                Delete newsroom account
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Confirmation Modal for Account Deletion */}
      {deleteModalOpen && (
        <Modal
          title="Delete Newsroom Account"
          onClose={() => setDeleteModalOpen(false)}
          onSubmit={handleDeleteAccount}
          submit="Permanently delete account"
        >
          <div className="flex flex-col gap-3 text-xs text-ink">
            <p className="font-medium text-danger-text">
              Warning: This action cannot be undone.
            </p>
            <p className="leading-[1.5] text-muted-ink">
              Your credentials will be revoked immediately and you will be signed out to the login screen.
            </p>
            <label className="flex flex-col gap-1.5 pt-2">
              <span className="font-medium text-ink">
                Please type your full name <strong>{person.name}</strong> to confirm:
              </span>
              <input
                type="text"
                required
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={person.name}
                className="w-full text-xs"
              />
            </label>
          </div>
        </Modal>
      )}
    </div>
  )
}
