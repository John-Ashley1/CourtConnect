import { useState } from 'react'
import { useAuth } from '../auth'
import { useAsync } from '../hooks/useAsync'
import { listMyNotifications, markAllRead, markRead } from '../services/notificationService'
import { timeAgo } from '../utils/format'
import AppLayout from '../components/AppLayout'
import AsyncContent from '../components/AsyncContent'
import { StatusBadge } from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import Icon from '../components/Icon'
import Modal from '../components/Modal'
import { SkeletonPage } from '../components/Skeleton'
import { useToast } from '../components/Toast'

/**
 * player-notifications / facility-notifications: all or unread, mark read, push opt-in (placeholder).
 * Shared by players and facility administrators; the list comes from the signed-in user's role.
 */
export default function Notifications({ description = 'Updates about bookings, payments, reminders and games.' }) {
  const { user } = useAuth()
  const toast = useToast()
  const [filter, setFilter] = useState('all')
  const [pushInfo, setPushInfo] = useState(false)
  const q = useAsync(() => listMyNotifications(user.role), [user.role])

  const readOne = async (n) => {
    try {
      await markRead(user.role, n.notification_id)
      q.setData((xs) => xs.map((x) => (x.notification_id === n.notification_id ? { ...x, is_read: true } : x)))
    } catch (ex) { toast(ex.message, 'err') }
  }
  const readAll = async () => {
    try {
      await markAllRead(user.role)
      q.setData((xs) => xs.map((x) => ({ ...x, is_read: true })))
      toast('All notifications marked as read.')
    } catch (ex) { toast(ex.message, 'err') }
  }

  return (
    <AppLayout title="Notifications" description={description}>
      <AsyncContent state={q} loading={<SkeletonPage rows={4} />} errorTitle="Can’t load notifications"
        reassurance="Notifications are still being recorded."
        isEmpty={(d) => !d.length}
        empty={<EmptyState icon="bell" title="No notifications yet">Booking and game updates will appear here.</EmptyState>}>
        {(items) => {
          const unread = items.filter((n) => !n.is_read).length
          const list = filter === 'all' ? items : items.filter((n) => !n.is_read)
          return <>
            <div className="banner bn-info mb-16"><Icon name="bell" />
              <span><b>Turn on push notifications</b> to get booking confirmations, reminders and requests on this device.</span>
              <Button size="sm" onClick={() => setPushInfo(true)}>Turn on</Button>
            </div>
            <div className="row-wrap mb-12">
              <div className="row-wrap" role="group" aria-label="Show">
                {[['all', `All (${items.length})`], ['unread', `Unread (${unread})`]].map(([k, label]) => (
                  <button key={k} type="button" className={'chip' + (filter === k ? ' on' : '')} aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}</button>
                ))}
              </div>
              <span className="grow" />
              <Button variant="link" size="sm" icon="check" disabled={!unread} onClick={readAll}>Mark all as read</Button>
            </div>
            {!list.length ? (
              <EmptyState icon="check" title="You’re all caught up">No unread notifications.</EmptyState>
            ) : (
              <Card className="pad-list">
                <ul className="plain">
                  {list.map((n) => (
                    <li className={'list-row' + (n.is_read ? '' : ' unread')} key={n.notification_id}>
                      <StatusBadge kind="notification" status={n.type} />
                      <div className="grow min0">
                        <p className={n.is_read ? 'note-text' : 'note-text b'}>{n.message}</p>
                        <p className="muted xsmall mt-2">{timeAgo(n.sent_at)}</p>
                      </div>
                      {!n.is_read && <>
                        <span className="sr-only">Unread</span>
                        <i className="unread-dot" aria-hidden="true" />
                        <Button variant="link" size="sm" onClick={() => readOne(n)}>Mark read</Button>
                      </>}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        }}
      </AsyncContent>

      <Modal open={pushInfo} title="Push notifications come later" onClose={() => setPushInfo(false)}
        footer={<Button onClick={() => setPushInfo(false)}>OK</Button>}>
        <p className="dlg-body">
          Push messages through Firebase Cloud Messaging connect in a later increment. Then your browser will ask for permission,
          and CourtConnect will register this device for booking confirmations, reminders and join requests.
          {'\n\n'}Until then, every update still appears on this page.
        </p>
      </Modal>
    </AppLayout>
  )
}
