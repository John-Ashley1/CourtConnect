import { useState } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { closeGame, listMyHostedGames, listMyJoinRequests, respondToRequest } from '../../services/gameService'
import { initials } from '../../roles'
import { fmtGameWhen, timeAgo } from '../../utils/format'
import AppLayout from '../../components/AppLayout'
import AsyncContent from '../../components/AsyncContent'
import Badge, { StatusBadge } from '../../components/Badge'
import Button from '../../components/Button'
import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import { ConfirmDialog } from '../../components/Modal'
import { SkeletonPage } from '../../components/Skeleton'
import Tabs, { TabPanel } from '../../components/Tabs'
import { useToast } from '../../components/Toast'

/** player-my-games: games I host (approve/decline, close) and join requests I've sent. */
export default function MyGames() {
  const toast = useToast()
  const [tab, setTab] = useState('host')
  const [ask, setAsk] = useState(null) // { kind: 'decline' | 'close', req?, game }
  const [busy, setBusy] = useState(false)
  const q = useAsync(() => Promise.all([listMyHostedGames(), listMyJoinRequests()]).then(([hosted, requests]) => ({ hosted, requests })), [])

  const replaceGame = (g) => q.setData((d) => ({ ...d, hosted: d.hosted.map((x) => (x.game_id === g.game_id ? g : x)) }))

  const act = async (fn, okMsg) => {
    setBusy(true)
    try {
      const g = await fn()
      replaceGame(g)
      toast(okMsg(g))
      setAsk(null)
    } catch (ex) {
      toast(ex.message, 'err')
      setAsk(null)
      q.reload()
    } finally { setBusy(false) }
  }

  const approve = (r) => act(() => respondToRequest(r.request_id, 'APPROVED'),
    (g) => `${r.player.full_name} approved. They’ve been notified.${g.status === 'FULL' ? ' The game is now full.' : ''}`)
  const decline = () => act(() => respondToRequest(ask.req.request_id, 'DECLINED'), () => `${ask.req.player.full_name} declined.`)
  const close = () => act(() => closeGame(ask.game.game_id), () => 'Game closed.')

  return (
    <AppLayout title="My games" description="Review join requests for games you host and track requests you’ve sent."
      actions={<Button to="/player/games/new" icon="plus">Post a game</Button>}>
      <AsyncContent state={q} loading={<SkeletonPage rows={3} />} errorTitle="Can’t load your games"
        isEmpty={(d) => !d.hosted.length && !d.requests.length}
        empty={<EmptyState icon="flag" title="You haven’t posted or joined any games" action={<Button to="/player/games">Browse open games</Button>}>
          Post a game or request to join one to see it here.
        </EmptyState>}>
        {({ hosted, requests }) => <>
          <Tabs idPrefix="mg" label="My games" value={tab} onChange={setTab}
            tabs={[{ id: 'host', label: 'Games I host', count: hosted.length }, { id: 'req', label: 'My join requests', count: requests.length }]} />
          <TabPanel idPrefix="mg" value={tab}>
            {tab === 'host' && (hosted.length ? (
              <div className="stack">
                {hosted.map((g) => (
                  <HostedGame key={g.game_id} g={g} busy={busy} onApprove={approve}
                    onDecline={(req) => setAsk({ kind: 'decline', req, game: g })} onClose={() => setAsk({ kind: 'close', game: g })} />
                ))}
              </div>
            ) : (
              <EmptyState icon="flag" title="You aren’t hosting any games" action={<Button to="/player/games/new">Post a game</Button>}>
                Games you post show up here with their join requests.
              </EmptyState>
            ))}
            {tab === 'req' && (requests.length ? (
              <Card className="pad-list">
                {requests.map((r) => (
                  <div className="list-row" key={r.request_id}>
                    <div className="grow"><b>{r.game.title}</b>
                      <p className="muted xsmall">{fmtGameWhen(r.game.game_schedule, r.game.duration_minutes)} · {r.game.location.split(' · ')[0]} · Host {r.game.creator.full_name}</p>
                    </div>
                    <StatusBadge kind="join" status={r.status} />
                  </div>
                ))}
              </Card>
            ) : (
              <EmptyState icon="users" title="No join requests yet" action={<Button to="/player/games">Browse open games</Button>}>
                Requests you send to other players’ games show up here.
              </EmptyState>
            ))}
          </TabPanel>
        </>}
      </AsyncContent>

      <ConfirmDialog open={ask?.kind === 'decline'} danger busy={busy} title={`Decline ${ask?.req?.player.full_name ?? ''}?`}
        confirmLabel="Decline request" onCancel={() => setAsk(null)} onConfirm={decline}>
        They’ll be notified that their request was declined. This can’t be undone.
      </ConfirmDialog>
      <ConfirmDialog open={ask?.kind === 'close'} danger busy={busy} title="Close this game?" confirmLabel="Close game"
        cancelLabel="Keep it open" onCancel={() => setAsk(null)} onConfirm={close}>
        No one will be able to request to join after you close it. This can’t be undone.
      </ConfirmDialog>
    </AppLayout>
  )
}

/** "Yesterday" → "yesterday", "Just now" → "just now"; dates and "5 minutes ago" stay as they are. */
const lowerRelative = (s) => (s === 'Yesterday' || s === 'Just now' ? s.toLowerCase() : s)

function HostedGame({ g, busy, onApprove, onDecline, onClose }) {
  const full = g.players_joined >= g.max_players
  const closed = g.status === 'CLOSED'
  const left = g.max_players - g.players_joined
  return (
    <Card>
      <div className="row-between wrap">
        <div>
          <div className="row-wrap gap-8"><Badge tone="info">{g.sport_type}</Badge><StatusBadge kind="game" status={g.status} /></div>
          <h2 className="mt-8 h-lg">{g.title}</h2>
          <p className="muted small mt-4">{fmtGameWhen(g.game_schedule, g.duration_minutes)} · {g.location} · Skill: {g.skill_level}</p>
        </div>
        {!closed && <Button variant="sec" onClick={onClose}>Close game</Button>}
      </div>
      <div className="mt-14 w-420">
        <div className="row-between small b mb-6"><span>{g.players_joined} of {g.max_players} players</span><span className="muted">{left > 0 ? `${left} ${left === 1 ? 'spot' : 'spots'} left` : 'No spots left'}</span></div>
        <div className="prog" role="progressbar" aria-label="Players joined" aria-valuemin={0} aria-valuemax={g.max_players} aria-valuenow={g.players_joined}>
          <i style={{ width: `${Math.min(100, Math.round((g.players_joined / g.max_players) * 100))}%` }} />
        </div>
      </div>
      <h3 className="h-sm mt-20">Join requests</h3>
      {!g.join_requests.length && <p className="muted small mt-8">No requests yet.</p>}
      {g.join_requests.map((r) => (
        <div className="list-row" key={r.request_id}>
          <span className="avatar avatar-soft" aria-hidden="true">{initials(r.player.full_name.replace(/[[\]]/g, ''))}</span>
          <div className="grow"><b>{r.player.full_name}</b><p className="muted xsmall">Requested {lowerRelative(timeAgo(r.requested_at))}</p></div>
          <StatusBadge kind="join" status={r.status} />
          {r.status === 'PENDING' && !closed && (
            <div className="row-wrap gap-6">
              <Button size="sm" disabled={full || busy} onClick={() => onApprove(r)} aria-label={`Approve ${r.player.full_name}`}>Approve</Button>
              <Button size="sm" variant="sec" disabled={busy} onClick={() => onDecline(r)} aria-label={`Decline ${r.player.full_name}`}>Decline</Button>
            </div>
          )}
        </div>
      ))}
      {full && !closed && <p className="hint">The game is full. Approving more players isn’t possible unless someone leaves.</p>}
    </Card>
  )
}
