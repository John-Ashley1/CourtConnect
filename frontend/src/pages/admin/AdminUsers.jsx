import { useState } from 'react'
import { ROLE_LABELS, STATUS } from '../../constants/status'
import { useAsync } from '../../hooks/useAsync'
import { listUsers, setUserRole, setUserStatus } from '../../services/userService'
import AppLayout from '../../components/AppLayout'
import AsyncContent from '../../components/AsyncContent'
import Badge, { StatusBadge } from '../../components/Badge'
import Button from '../../components/Button'
import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import Input from '../../components/Input'
import { ConfirmDialog } from '../../components/Modal'
import Select from '../../components/Select'
import { SkeletonPage } from '../../components/Skeleton'
import Table from '../../components/Table'
import { useToast } from '../../components/Toast'

const ROLES = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))
const STATUSES = Object.entries(STATUS.user).map(([value, s]) => ({ value, label: s.label }))
const joined = (iso) => new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })

/** admin-users: search/filter accounts, change role, activate/deactivate (with confirmation). */
export default function AdminUsers() {
  const toast = useToast()
  const q = useAsync(() => listUsers(), [])
  const [text, setText] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [ask, setAsk] = useState(null) // { kind: 'role' | 'status', user, value }
  const [busy, setBusy] = useState(false)

  const apply = async () => {
    setBusy(true)
    const { kind, user, value } = ask
    try {
      const u = kind === 'role' ? await setUserRole(user.user_id, value) : await setUserStatus(user.user_id, value)
      q.setData((rows) => rows.map((r) => (r.user_id === u.user_id ? { ...r, ...u } : r)))
      toast(kind === 'role' ? `${u.full_name} is now a ${ROLE_LABELS[value]}.` : `${u.full_name} ${value === 'ACTIVE' ? 'activated' : 'deactivated'}.`)
    } catch (ex) { toast(ex.message, 'err') } finally { setBusy(false); setAsk(null) }
  }

  return (
    <AppLayout title="Users & roles" description="View accounts, assign roles, and activate or deactivate access.">
      {!q.notBuilt && (<Card className="mb-16">
        <div className="toolbar mb-0">
          <Input id="us-q" label="Search" type="search" placeholder="Name or email" value={text} onChange={(e) => setText(e.target.value)} />
          <Select id="us-r" label="Role" placeholder="All roles" options={ROLES} value={role} onChange={(e) => setRole(e.target.value)} />
          <Select id="us-s" label="Status" placeholder="All" options={STATUSES} value={status} onChange={(e) => setStatus(e.target.value)} />
        </div>
      </Card>)}

      <AsyncContent state={q} loading={<SkeletonPage kind="table" rows={6} />} errorTitle="Can’t load users"
        reassurance="No accounts were changed."
        isEmpty={(d) => !d.length}
        empty={<EmptyState icon="users" title="No users yet">Accounts appear here as people register.</EmptyState>}>
        {(users) => {
          const t = text.trim().toLowerCase()
          const list = users.filter((u) => (!role || u.role === role) && (!status || u.status === status)
            && (!t || `${u.full_name} ${u.email}`.toLowerCase().includes(t)))
          return <>
            <p className="b mb-12" aria-live="polite">{list.length} {list.length === 1 ? 'user' : 'users'} shown</p>
            {!list.length ? (
              <EmptyState icon="search" title="No users match">Try a different search, role or status.</EmptyState>
            ) : (
              <Table caption="User accounts" rowKey={(u) => u.user_id} rows={list} minWidth={860} columns={[
                { key: 'name', label: 'Name', render: (u) => <><b>{u.full_name}</b>{u.is_me && <> <Badge tone="info">You</Badge></>}</> },
                { key: 'email', label: 'Email' },
                { key: 'role', label: 'Role', render: (u) => (
                  <select className="inp inp-sm" aria-label={`Role for ${u.full_name}`} value={u.role} disabled={u.is_me}
                    onChange={(e) => setAsk({ kind: 'role', user: u, value: e.target.value })}>
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                ) },
                { key: 'status', label: 'Status', render: (u) => <StatusBadge kind="user" status={u.status} /> },
                { key: 'joined', label: 'Joined', render: (u) => <span className="nowrap">{joined(u.created_at)}</span> },
                { key: 'act', label: <span className="sr-only">Actions</span>, render: (u) => {
                  const active = u.status === 'ACTIVE'
                  return (
                    <Button variant="link" size="sm" className={active ? 'danger-text' : ''} disabled={u.is_me}
                      aria-label={`${active ? 'Deactivate' : 'Activate'} ${u.full_name}`}
                      onClick={() => setAsk({ kind: 'status', user: u, value: active ? 'DEACTIVATED' : 'ACTIVE' })}>
                      {active ? 'Deactivate' : 'Activate'}
                    </Button>
                  )
                } },
              ]} />
            )}
            <p className="hint mt-16">You can’t change your own role or deactivate your own account. Role changes apply the next time that person signs in.</p>
          </>
        }}
      </AsyncContent>

      <ConfirmDialog open={ask?.kind === 'role'} busy={busy} title="Change role?" confirmLabel="Change role"
        onCancel={() => setAsk(null)} onConfirm={apply}>
        {ask?.kind === 'role' && `${ask.user.full_name} will become a ${ROLE_LABELS[ask.value]}. They’ll only see the menus and data allowed for that role the next time they sign in.`}
      </ConfirmDialog>
      <ConfirmDialog open={ask?.kind === 'status'} busy={busy} danger={ask?.value === 'DEACTIVATED'}
        title={ask?.kind === 'status' ? `${ask.value === 'ACTIVE' ? 'Activate' : 'Deactivate'} ${ask.user.full_name}?` : ''}
        confirmLabel={ask?.value === 'ACTIVE' ? 'Activate' : 'Deactivate'} onCancel={() => setAsk(null)} onConfirm={apply}>
        {ask?.value === 'DEACTIVATED' ? 'They won’t be able to sign in until the account is activated again. Their booking records are kept.' : 'They’ll be able to sign in again.'}
      </ConfirmDialog>
    </AppLayout>
  )
}
