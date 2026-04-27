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
      <section className="flex flex-col md:flex-row gap-6 md:items-center justify-between fin-card bg-brand text-white border-none rounded-2xl shadow-fin-md mb-6">
        <div>
          <Link className="text-accent-light hover:text-white text-sm font-semibold mb-4 inline-block transition-fin" to={isGroupSettings ? `/groups/${groupId}` : '/dashboard'}>
            &larr; Back to {isGroupSettings ? 'group' : 'dashboard'}
          </Link>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">Settings</h1>
          <p className="text-sm text-slate-300 max-w-lg">
            Manage your {isGroupSettings ? 'group configuration' : 'personal profile'} and security.
          </p>
        </div>
      </section>

      {!isGroupSettings && (
        <div className="grid grid-cols-1 max-w-2xl">
          <SectionCard eyebrow="Security" title="Change Password">
            {pwdNotice && <p className="fin-pill fin-pill-positive w-full justify-start text-sm px-4 py-3 mb-2">{pwdNotice}</p>}
            {pwdError && <p className="fin-pill fin-pill-negative w-full justify-start text-sm px-4 py-3 mb-2">{pwdError}</p>}
            
            <form className="flex flex-col gap-4 mt-2" onSubmit={handlePasswordSubmit}>
              <label className="block">
                <span className="fin-label">Current Password</span>
                <input
                  className="fin-input"
                  type="password"
                  required
                  value={pwdForm.currentPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="fin-label">New Password</span>
                <input
                  className="fin-input"
                  type="password"
                  required
                  value={pwdForm.newPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                />
              </label>
              <div className="flex justify-end mt-2">
                <button className="btn btn-primary w-full sm:w-auto" disabled={pwdSubmitting} type="submit">
                  {pwdSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </SectionCard>
        </div>
      )}

      {isGroupSettings && group && (
        <div className="grid grid-cols-1 max-w-2xl">
          <SectionCard eyebrow="Group Management" subtitle="Only group owners can perform these actions." title="Danger Zone">
            {groupError && <p className="fin-pill fin-pill-negative w-full justify-start text-sm px-4 py-3 mb-2">{groupError}</p>}
            
            {currentRole === 'owner' ? (
              <div className="flex flex-col gap-4 mt-2">
                <div className="border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-fin bg-white flex flex-col gap-3">
                  <h3 className="text-lg font-bold text-brand m-0">Archive Group</h3>
                  <p className="text-sm text-slate-600 m-0">Archiving the group prevents any new expenses or settlements from being added. The group remains visible for historical reference.</p>
                  <button 
                    className="btn btn-secondary self-start mt-2" 
                    disabled={groupActioning}
                    onClick={handleArchiveGroup}
                  >
                    Archive Group
                  </button>
                </div>

                <div className="border border-red-200 bg-red-50/50 rounded-xl p-5 transition-fin flex flex-col gap-3">
                  <h3 className="text-lg font-bold text-red-700 m-0">Delete Group</h3>
                  <p className="text-sm text-red-800/80 m-0">Permanently delete this group and all its data. This action is irreversible. The system will reject deletion if there are any unsettled balances.</p>
                  <button 
                    className="btn bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 self-start mt-2" 
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
