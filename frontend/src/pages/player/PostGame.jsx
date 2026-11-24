import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth'
import { SPORTS } from '../../constants/status'
import { useAsync } from '../../hooks/useAsync'
import { searchCourts } from '../../services/courtService'
import { getBooking } from '../../services/bookingService'
import { createGame } from '../../services/gameService'
import { addDays, fmtDate, fmtTime, isoDate } from '../../utils/format'
import AppLayout from '../../components/AppLayout'
import AsyncContent from '../../components/AsyncContent'
import Button from '../../components/Button'
import Card from '../../components/Card'
import Icon from '../../components/Icon'
import Input from '../../components/Input'
import Select from '../../components/Select'
import { SkeletonPage } from '../../components/Skeleton'
import { useToast } from '../../components/Toast'
import { GameCard } from './OpenGames'

const DAYS = 14
const SKILLS = ['Any level', 'Beginner', 'Intermediate', 'Advanced']
const HOURS = Array.from({ length: 17 }, (_, i) => 6 + i) // 6 AM … 10 PM
const hourLabel = (h) => fmtTime(`${String(h).padStart(2, '0')}:00:00`)
const EMPTY = { title: '', sport: '', date: '', start: '17', end: '19', loc: '', locText: '', need: '4', skill: 'Any level' }

/** player-post-game: form with validation and live preview. ?bookingId= pre-fills from a booking. */
export default function PostGame() {
  const [params] = useSearchParams()
  const bookingId = params.get('bookingId')
  const q = useAsync(() => Promise.all([
    searchCourts({}),
    bookingId ? getBooking(bookingId).catch(() => null) : Promise.resolve(null),
  ]).then(([courts, booking]) => ({ courts, booking })), [bookingId])

  return (
    <AppLayout title="Post an open game" description="Tell other players what you’re playing, when and where, and how many you need.">
      <AsyncContent state={q} loading={<SkeletonPage kind="cards" rows={2} />} errorTitle="Can’t post games right now"
        reassurance="Nothing was posted.">
        {(d) => <PostGameForm courts={d.courts} booking={d.booking} />}
      </AsyncContent>
    </AppLayout>
  )
}

function PostGameForm({ courts, booking }) {
  const { user } = useAuth()
  const toast = useToast()
  const today = isoDate()
  const [f, setF] = useState(EMPTY)
  const [err, setErr] = useState({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)

  useEffect(() => {
    if (!booking) return
    setF((x) => ({
      ...x, sport: booking.court.sport_type, date: booking.slot.slot_date, loc: String(booking.court.court_id),
      start: String(Number(booking.slot.start_time.slice(0, 2))), end: String(Number(booking.end_time.slice(0, 2))),
      title: x.title || `${booking.court.sport_type} game`,
    }))
  }, [booking])

  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErr({ ...err, [k]: null }); setDone(null) }

  const courtOpts = courts.map((c) => ({ value: String(c.court_id), label: `${c.facility.name} · ${c.court_name}`, sport: c.sport_type }))
  const court = courtOpts.find((c) => c.value === f.loc)
  const dates = Array.from({ length: DAYS }, (_, i) => { const d = addDays(today, i); return { value: d, label: (i === 0 ? 'Today · ' : '') + fmtDate(d) } })
  const location = court ? court.label : f.loc === 'other' ? f.locText.trim() : ''
  const need = Number(f.need)

  const validate = () => {
    const e = {}
    if (!f.title.trim()) e.title = 'Give your game a short title.'
    else if (f.title.trim().length > 60) e.title = 'Keep the title under 60 characters.'
    if (!f.sport) e.sport = 'Choose a sport.'
    if (!f.date) e.date = 'Choose a date.'
    if (+f.end <= +f.start) e.end = 'End time must be after the start time.'
    else if (f.date === today && +f.start <= new Date().getHours()) e.end = 'That start time has already passed today.'
    if (!f.loc) e.loc = 'Choose where you’ll play.'
    else if (f.loc === 'other' && !f.locText.trim()) e.loc = 'Type the location.'
    else if (court && f.sport && court.sport !== f.sport) e.loc = `That court is for ${court.sport}. Pick a ${f.sport} court or another location.`
    if (!Number.isInteger(need) || need < 2 || need > 30) e.need = 'Enter a number from 2 to 30.'
    return e
  }

  const submit = async (ev) => {
    ev.preventDefault()
    const e = validate()
    setErr(e)
    if (Object.keys(e).length) {
      document.getElementById(`pg-${Object.keys(e)[0]}`)?.focus()
      return
    }
    setBusy(true)
    try {
      const g = await createGame({
        title: f.title.trim(), sport_type: f.sport,
        game_schedule: new Date(`${f.date}T${String(f.start).padStart(2, '0')}:00:00`).toISOString(),
        duration_minutes: (+f.end - +f.start) * 60, location, max_players: need, skill_level: f.skill,
      })
      setDone(g)
      setF(EMPTY)
      toast('Game posted.')
      window.scrollTo(0, 0)
    } catch (ex) {
      if (Object.keys(ex.fieldErrors ?? {}).length) setErr(ex.fieldErrors)
      toast(ex.offline ? 'The server didn’t respond. Your game wasn’t posted. Try again.' : ex.message, 'err')
    } finally { setBusy(false) }
  }

  const preview = {
    sport_type: f.sport || 'Sport', title: f.title.trim() || 'Your game title', status: 'OPEN',
    when: `${f.date ? fmtDate(f.date) : 'Date'} · ${hourLabel(+f.start)}–${hourLabel(+f.end)}`,
    location: location || 'Location', creator: { full_name: user.fullName }, skill_level: f.skill,
    players_joined: 1, max_players: need >= 2 && need <= 30 ? need : 2,
  }

  return (
    <div className="split align-start">
      <Card as="form" className="split-main stack" onSubmit={submit} noValidate>
        {done && (
          <div className="banner bn-ok" role="status"><Icon name="check" />
            <span>“{done.title}” is posted and other players can now request to join.</span>
            <Button size="sm" to="/player/my-games">Go to my games</Button>
          </div>
        )}
        {booking && !done && <div className="banner bn-info"><Icon name="info" /><span>Filled in from booking {booking.qr_code}. Change anything you like.</span></div>}
        <div className="form-grid">
          <Input id="pg-title" label="Game title" placeholder="e.g. Basketball 3v3" maxLength={60} value={f.title} onChange={set('title')} error={err.title} />
          <Select id="pg-sport" label="Sport" placeholder="Choose a sport" options={SPORTS} value={f.sport} onChange={set('sport')} error={err.sport} />
          <Select id="pg-date" label="Date" placeholder="Choose a date" options={dates} value={f.date} onChange={set('date')} error={err.date} />
          <div className="pair">
            <Select id="pg-start" label="Start" options={HOURS.slice(0, -1).map((h) => ({ value: String(h), label: hourLabel(h) }))} value={f.start} onChange={set('start')} />
            <Select id="pg-end" label="End" options={HOURS.slice(1).map((h) => ({ value: String(h), label: hourLabel(h) }))} value={f.end} onChange={set('end')}
              aria-invalid={!!err.end} aria-describedby={err.end ? 'pg-end-err' : undefined} />
            {err.end && <p className="ferr span-2" id="pg-end-err" role="alert">{err.end}</p>}
          </div>
        </div>
        <div>
          <Select id="pg-loc" label="Location" placeholder="Choose a court" value={f.loc} onChange={set('loc')} error={err.loc}
            options={[...courtOpts, { value: 'other', label: 'Other location' }]}
            hint="Posting a game doesn’t reserve the court. Book the slot separately if you need one." />
          {f.loc === 'other' && (
            <Input id="pg-locText" label="Other location" placeholder="Where will you play?" maxLength={120} value={f.locText} onChange={set('locText')} />
          )}
        </div>
        <div className="form-grid">
          <Input id="pg-need" label="Players needed (including you)" type="number" min={2} max={30} inputMode="numeric"
            value={f.need} onChange={set('need')} error={err.need} />
          <Select id="pg-skill" label="Preferred skill level" optional options={SKILLS} value={f.skill} onChange={set('skill')} />
        </div>
        <div className="row-wrap">
          <Button type="submit" busy={busy}>{busy ? 'Posting…' : 'Post game'}</Button>
          <Button variant="sec" to="/player/games">Cancel</Button>
        </div>
      </Card>

      <aside className="split-side" aria-label="Preview">
        <p className="b mb-8">Preview</p>
        <GameCard g={preview} preview />
      </aside>
    </div>
  )
}
