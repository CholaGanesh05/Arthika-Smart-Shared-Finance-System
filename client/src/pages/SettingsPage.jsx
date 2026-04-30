import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Camera,
  CircleUser,
  Lock,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { LoadingScreen } from '../components/LoadingScreen'
import { SectionCard } from '../components/SectionCard'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { getInitials, getMemberRole } from '../utils/helpers'

export default function SettingsPage() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { token, user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState(null)
  const [pendingAction, setPendingAction] = useState('')

  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '' })
  const [pwdSubmitting, setPwdSubmitting] = useState(false)
  const [pwdNotice, setPwdNotice] = useState('')
  const [pwdError, setPwdError] = useState('')

  const [groupActioning, setGroupActioning] = useState(false)
  const [groupError, setGroupError] = useState('')

  useEffect(() => {
    async function loadGroup() {
      if (!groupId) {
        setLoading(false)
        return
      }

      try {
        const payload = await api.getGroup(token, groupId)
        setGroup(payload.data)
      } catch (loadError) {
        setGroupError(loadError.message)
      } finally {
        setLoading(false)
      }
    }

    void loadGroup()
  }, [groupId, token])

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    setPwdNotice('')
    setPwdError('')

    if (pwdForm.newPassword.length < 8) {
      setPwdError('Password must be at least 8 characters long.')
      return
    }

    setPwdSubmitting(true)

    try {
      await api.updatePassword(token, {
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      })
      setPwdNotice('Password updated successfully.')
      setPwdForm({ currentPassword: '', newPassword: '' })
    } catch (submitError) {
      setPwdError(submitError.message)
    } finally {
      setPwdSubmitting(false)
    }
  }

  async function handleArchiveGroup() {
    setGroupActioning(true)

    try {
      await api.archiveGroup(token, groupId)
      navigate('/dashboard')
    } catch (archiveError) {
      setGroupError(archiveError.message)
      setGroupActioning(false)
    }
  }

  async function handleDeleteGroup() {
    setGroupActioning(true)

    try {
      await api.deleteGroup(token, groupId)
      navigate('/dashboard')
    } catch (deleteError) {
      setGroupError(deleteError.message)
      setGroupActioning(false)
    }
  }

  if (loading) {
    return <LoadingScreen label="Loading settings..." />
  }

  const isGroupSettings = Boolean(groupId)
  const currentRole = group ? getMemberRole(group, user.id) : null

  return (
    <div className="space-y-6 pb-8">
      <section className="hero-banner fin-card hero-balance">
        <div className="fin-card-inner flex flex-col gap-5">
          <Link className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]" to={isGroupSettings ? `/groups/${groupId}` : '/dashboard'}>
            <ArrowLeft size={16} strokeWidth={1.5} />
            Back to {isGroupSettings ? 'group' : 'dashboard'}
          </Link>
          <div className="space-y-3">
            <p className="section-eyebrow">Settings</p>
            <h1 className="text-3xl font-display md:text-5xl">
              {isGroupSettings ? 'Shape the group workspace' : 'Keep your account secure'}
            </h1>
            <p className="fin-copy max-w-2xl text-base">
              {isGroupSettings
                ? 'Manage ownership-sensitive actions without leaving the shared finance flow.'
                : 'Your profile, identity, and account security live here.'}
            </p>
          </div>
        </div>

        <div className="fin-card fin-card-static p-5">
          <div className="fin-card-inner flex h-full flex-col gap-4">
            <p className="fin-kicker">{isGroupSettings ? 'Role access' : 'Profile'}</p>
            <div className="flex items-center gap-3">
              <div className="avatar h-12 w-12 rounded-2xl">{getInitials(user?.name)}</div>
              <div>
                <p className="font-cabinet text-sm font-bold text-[var(--text-primary)]">{user?.name}</p>
                <p className="text-sm text-[var(--text-secondary)]">{isGroupSettings ? `${currentRole || 'member'} access` : user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!isGroupSettings ? (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard eyebrow="Profile" icon={CircleUser} subtitle="A clean read of the account details currently available in the session." title="Profile">
            <div className="grid gap-4 md:grid-cols-[140px_minmax(0,1fr)] md:items-center">
              <div className="relative mx-auto h-28 w-28 rounded-full border border-[var(--glass-border)] bg-[rgba(255,255,255,0.04)]">
                <div className="avatar h-full w-full rounded-full text-3xl">{getInitials(user?.name)}</div>
                <div className="absolute inset-x-0 bottom-2 mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[rgba(17,29,53,0.96)]">
                  <Camera color="var(--primary-light)" size={16} strokeWidth={1.5} />
                </div>
              </div>

              <div className="grid gap-4">
                <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                  <p className="fin-kicker">Name</p>
                  <p className="mt-2 font-cabinet text-sm text-[var(--text-primary)]">{user?.name || 'Unknown user'}</p>
                </article>
                <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                  <p className="fin-kicker">Email</p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-[var(--text-primary)]">
                    <Lock color="var(--text-secondary)" size={16} strokeWidth={1.5} />
                    <span>{user?.email || 'No email available'}</span>
                  </div>
                </article>
              </div>
            </div>
          </SectionCard>

          <SectionCard eyebrow="Security" icon={ShieldCheck} subtitle="Passwords update inline so you do not lose context." title="Change password">
            {(pwdNotice || pwdError) && (
              <div className="notice-stack">
                {pwdNotice ? (
                  <div className="notice notice--success">
                    <ShieldCheck color="var(--success)" size={18} strokeWidth={1.5} />
                    <p className="text-sm text-[var(--success)]">{pwdNotice}</p>
                  </div>
                ) : null}
                {pwdError ? (
                  <div className="notice notice--error">
                    <Lock color="var(--danger)" size={18} strokeWidth={1.5} />
                    <p className="text-sm text-[var(--danger)]">{pwdError}</p>
                  </div>
                ) : null}
              </div>
            )}

            <form className="grid gap-4" onSubmit={handlePasswordSubmit}>
              <label className="block">
                <span className="fin-label">Current password</span>
                <input
                  className="fin-input"
                  onChange={(event) => setPwdForm({ ...pwdForm, currentPassword: event.target.value })}
                  required
                  type="password"
                  value={pwdForm.currentPassword}
                />
              </label>

              <label className="block">
                <span className="fin-label">New password</span>
                <input
                  className="fin-input"
                  onChange={(event) => setPwdForm({ ...pwdForm, newPassword: event.target.value })}
                  required
                  type="password"
                  value={pwdForm.newPassword}
                />
              </label>

              <div className="flex justify-end">
                <button className="btn btn-primary sm:w-auto" disabled={pwdSubmitting} type="submit">
                  <ShieldCheck size={18} strokeWidth={1.5} />
                  {pwdSubmitting ? 'Updating...' : 'Update password'}
                </button>
              </div>
            </form>
          </SectionCard>
        </div>
      ) : null}

      {isGroupSettings && group ? (
        <SectionCard eyebrow="Owner controls" icon={Trash2} subtitle="Use these actions carefully. Archiving makes the group read-only and deletion is permanent." title="Danger zone">
          {groupError ? (
            <div className="notice notice--error">
              <Trash2 color="var(--danger)" size={18} strokeWidth={1.5} />
              <p className="text-sm text-[var(--danger)]">{groupError}</p>
            </div>
          ) : null}

          {currentRole === 'owner' ? (
            <div className="grid gap-4">
              <article className="rounded-[24px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-5">
                <p className="fin-kicker">Archive group</p>
                <h3 className="mt-2 text-2xl font-display">Freeze new activity</h3>
                <p className="mt-2 fin-copy text-sm">
                  Archiving the group prevents new expenses or settlements while keeping the existing ledger visible for reference.
                </p>
                <button className="btn btn-secondary mt-4 sm:w-auto" disabled={groupActioning} onClick={() => setPendingAction('archive')} type="button">
                  <ShieldCheck size={18} strokeWidth={1.5} />
                  Archive group
                </button>
              </article>

              <article className="rounded-[24px] border border-red-400/20 bg-[rgba(127,29,29,0.24)] p-5">
                <p className="fin-kicker text-[var(--danger)]">Delete group</p>
                <h3 className="mt-2 text-2xl font-display text-[var(--danger)]">Remove everything</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  This permanently deletes the group and the backend will only allow it if all debts are already settled.
                </p>
                <button className="btn btn-danger mt-4 sm:w-auto" disabled={groupActioning} onClick={() => setPendingAction('delete')} type="button">
                  <Trash2 size={18} strokeWidth={1.5} />
                  Delete group
                </button>
              </article>
            </div>
          ) : (
            <EmptyState description="You must be the group owner to manage destructive settings here." icon={ShieldCheck} title="Access restricted" />
          )}
        </SectionCard>
      ) : null}

      <ConfirmDialog
        busy={groupActioning}
        confirmLabel={pendingAction === 'delete' ? 'Delete group' : 'Archive group'}
        description={
          pendingAction === 'delete'
            ? 'This will permanently remove the group. The action is irreversible and the backend may reject it if balances remain unsettled.'
            : 'This will make the group read-only so no new activity can be added.'
        }
        onCancel={() => {
          if (!groupActioning) {
            setPendingAction('')
          }
        }}
        onConfirm={async () => {
          if (pendingAction === 'delete') {
            await handleDeleteGroup()
            return
          }

          await handleArchiveGroup()
        }}
        open={Boolean(pendingAction)}
        title={pendingAction === 'delete' ? 'Delete this group?' : 'Archive this group?'}
      />
    </div>
  )
}
