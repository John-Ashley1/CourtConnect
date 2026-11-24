import { useState } from 'react'
import { SPORTS } from '../../constants/status'
import { useAsync } from '../../hooks/useAsync'
import { listOpenGames, requestToJoin } from '../../services/gameService'
import { fmtGameWhen } from '../../utils/format'
import AppLayout from '../../components/AppLayout'
import AsyncContent from '../../components/AsyncContent'
import Badge, { StatusBadge } from '../../components/Badge'
import Button from '../../components/Button'
import EmptyState from '../../components/EmptyState'
import Icon from '../../components/Icon'
import { ConfirmDialog } from '../../components/Modal'
import { SkeletonPage } from '../../components/Skeleton'
import { useToast } from '../../components/Toast'

/** player-open-games: browse games by sport, request to join. */
export default function OpenGames() {
  const toast = useToast()
  const [sport, setSport] = useState('All')
  const [openOnly, setOpenOnly] = useState(false)
  const [joining, setJoining] = useState(null)
  const [busy, setBusy] = useState(false)
  const q = useAsync(() => listOpenGames({ sport, openOnly }), [sport, openOnly])

  const join = async () => {
    setBusy(true)
    try {
      const r = await requestToJoin(joining.game_id)
      q.setData((games) => games.map((g) => (g.game_id === joining.game_id ? { ...g, my_request: r } : g)))
      toast(`Request sent to ${joining.creator.full_name}.`)
      setJoining(null)
    } catch (ex) {
      toast(ex.message, 'err')
      setJoining(null)
      q.reload()
    } finally { setBusy(false) }
  }

  return (
    <AppLayout title="Open games" description="Join a recreational game posted by other players near you."
      actions={!q.notBuilt && <Button to="/player/games/new" icon="plus">Post a game</Button>}>
      {!q.notBuilt && (<div className="row-wrap mb-16">
        <div className="row-wrap" role="group" aria-label="Filter by sport">
          {['All', ...SPORTS].map((s) => (
            <button key={s} type="button" className={'chip' + (sport === s ? ' on' : '')} aria-pressed={sport === s} onClick={() => setSport(s)}>{s}</button>
          ))}
        </div>
        <span className="grow" />
        <label className="check check-sm m-0">
          <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} /> Only games with open spots
        </label>
      </div>)}

      <AsyncContent state={q} loading={<SkeletonPage kind="cards" rows={1} />} errorTitle="Can’t load open games"
        isEmpty={(d) => !d.length}
        empty={sport === 'All' && !openOnly
          ? <EmptyState icon="users" title="No open games right now" action={<Button to="/player/games/new">Post a game</Button>}>Nobody has posted a game yet. Be the first.</EmptyState>
          : <EmptyState icon="users" title="No open games match" action={<Button to="/player/games/new">Post a game</Button>}>Try another sport, or post your own game.</EmptyState>}>
        {(games) => <>
          <p className="b mb-12" aria-live="polite">{games.length} {games.length === 1 ? 'game' : 'games'}</p>
          <div className="card-grid">
            {games.map((g) => <GameCard key={g.game_id} g={g} onJoin={() => setJoining(g)} />)}
          </div>
        </>}
      </AsyncContent>

      <ConfirmDialog open={!!joining} busy={busy} title="Request to join?" confirmLabel="Send request"
        onCancel={() => setJoining(null)} onConfirm={join}>
        {joining && `${joining.title}\n${fmtGameWhen(joining.game_schedule, joining.duration_minutes)}\n${joining.location}\n\n${joining.creator.full_name} will review your request. You’ll get a notification when they respond.`}
      </ConfirmDialog>
    </AppLayout>
  )
}

export function GameCard({ g, onJoin, preview }) {
  const left = g.max_players - g.players_joined
  const req = g.my_request?.status
  return (
    <article className="card game-card">
      <div className="row-between">
        <div><Badge tone="info">{g.sport_type}</Badge><h2 className="mt-8">{g.title}</h2></div>
        <StatusBadge kind="game" status={g.status} />
      </div>
      <p className="icon-line"><Icon name="calendar" size={17} /> {g.when ?? fmtGameWhen(g.game_schedule, g.duration_minutes)}</p>
      <p className="icon-line"><Icon name="pin" size={17} /> {g.location}</p>
      <p className="muted small">Hosted by {g.creator.full_name} · Skill: {g.skill_level}</p>
      <div>
        <div className="row-between small b mb-6"><span>{g.players_joined} of {g.max_players} players</span><span className="muted">{left > 0 ? `${left} ${left === 1 ? 'spot' : 'spots'} left` : 'No spots left'}</span></div>
        <div className="prog" role="progressbar" aria-label="Players joined" aria-valuemin={0} aria-valuemax={g.max_players} aria-valuenow={g.players_joined}>
          <i style={{ width: `${Math.min(100, Math.round((g.players_joined / g.max_players) * 100))}%` }} />
        </div>
      </div>
      {!preview && (
        req === 'PENDING' ? <p className="badge b-pend req-note">Request sent · waiting for host</p>
          : req === 'APPROVED' ? <p className="badge b-ok req-note">You’re in this game</p>
          : req === 'DECLINED' ? <p className="badge b-bad req-note">Your request was declined</p>
          : g.status === 'OPEN' ? <Button onClick={onJoin}>Request to join</Button>
          : <Button variant="sec" disabled>{g.status === 'FULL' ? 'Game is full' : 'Game is closed'}</Button>
      )}
    </article>
  )
}
