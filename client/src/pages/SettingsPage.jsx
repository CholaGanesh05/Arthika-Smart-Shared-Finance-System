import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { LoadingScreen } from '../components/LoadingScreen'
import { EmptyState } from '../components/EmptyState'
import { SectionCard } from '../components/SectionCard'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { getMemberRole } from '../utils/helpers'

export default function SettingsPage() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState(null)
  
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
      } catch (err) {
        setGroupError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadGroup()
  }, [groupId, token])

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPwdNotice('')
    setPwdError('')
    
    // Client-side validation
    if (pwdForm.newPassword.length < 8) {
      setPwdError('Password must be at least 8 characters long.')
      return
    }

    setPwdSubmitting(true)
    try {
      await api.updatePassword(token, {
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword
      })
      setPwdNotice('Password updated successfully.')
      setPwdForm({ currentPassword: '', newPassword: '' })
    } catch (err) {
      setPwdError(err.message)
    } finally {
      setPwdSubmitting(false)
    }
  }

  const handleArchiveGroup = async () => {
    if (!window.confirm("Are you sure you want to archive this group? It will become read-only.")) return;
    setGroupActioning(true)
    try {
      await api.archiveGroup(token, groupId)
      navigate('/dashboard')
    } catch (err) {
      setGroupError(err.message)
      setGroupActioning(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (!window.confirm("Are you absolutely sure you want to delete this group? All debts must be settled. This action cannot be undone.")) return;
    setGroupActioning(true)
    try {
      await api.deleteGroup(token, groupId)
      navigate('/dashboard')
    } catch (err) {
      setGroupError(err.message)
      setGroupActioning(false)
    }
  }

  if (loading) return <LoadingScreen label="Loading settings..." />

  const isGroupSettings = !!groupId
  const currentRole = group ? getMemberRole(group, user.id) : null

  return (
    <>
      <section className="page-hero">
        <div>
          <Link className="inline-link" to={isGroupSettings ? `/groups/${groupId}` : '/dashboard'}>
            ← Back to {isGroupSettings ? 'group' : 'dashboard'}
          </Link>
          <h1>Settings</h1>
          <p className="page-hero__lede">
            Manage your {isGroupSettings ? 'group configuration' : 'personal profile'} and security.
          </p>
        </div>
      </section>

      {!isGroupSettings && (
        <div className="section-grid section-grid--wide">
          <SectionCard eyebrow="Security" title="Change Password">
            {pwdNotice && <p className="notice notice--success">{pwdNotice}</p>}
            {pwdError && <p className="notice notice--error">{pwdError}</p>}
            
            <form className="form-grid" onSubmit={handlePasswordSubmit}>
              <label className="input-field">
                <span>Current Password</span>
                <input
                  type="password"
                  required
                  value={pwdForm.currentPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                />
              </label>
              <label className="input-field">
                <span>New Password</span>
                <input
                  type="password"
                  required
                  value={pwdForm.newPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                />
              </label>
              <div className="button-row">
                <button className="button button--primary" disabled={pwdSubmitting} type="submit">
                  {pwdSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </SectionCard>
        </div>
      )}

      {isGroupSettings && group && (
        <div className="section-grid section-grid--wide">
          <SectionCard eyebrow="Group Management" subtitle="Only group owners can perform these actions." title="Danger Zone">
            {groupError && <p className="notice notice--error">{groupError}</p>}
            
            {currentRole === 'owner' ? (
              <div className="stack">
                <div className="group-card" style={{ borderColor: 'var(--color-border-hover)' }}>
                  <div className="group-card__header">
                    <h3>Archive Group</h3>
                  </div>
                  <p>Archiving the group prevents any new expenses or settlements from being added. The group remains visible for historical reference.</p>
                  <button 
                    className="button button--ghost" 
                    disabled={groupActioning}
                    onClick={handleArchiveGroup}
                  >
                    Archive Group
                  </button>
                </div>

                <div className="group-card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                  <div className="group-card__header">
                    <h3 style={{ color: 'var(--color-negative)' }}>Delete Group</h3>
                  </div>
                  <p>Permanently delete this group and all its data. This action is irreversible. The system will reject deletion if there are any unsettled balances.</p>
                  <button 
                    className="button" 
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-negative)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                    disabled={groupActioning}
                    onClick={handleDeleteGroup}
                  >
                    Delete Group
                  </button>
                </div>
              </div>
            ) : (
              <EmptyState title="Access Restricted" description="You must be the group Owner to manage these settings." />
            )}
          </SectionCard>
        </div>
      )}
    </>
  )
}
