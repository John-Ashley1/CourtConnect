import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { ROLES, initials } from '../roles'
import AppLayout from '../components/AppLayout'
import EmptyState from '../components/EmptyState'
import Field from '../components/Field'
import Icon from '../components/Icon'
import ChangePasswordCard from '../components/ChangePasswordCard'

const PH_MOBILE = /^09\d{9}$/

/** Same rules as the backend (UserService); the backend is still the final check. */
function validate(f) {
  const err = {}
  const name = f.fullName.trim()
  if (!name) err.fullName = 'Enter your full name.'
  else if (name.length < 2 || name.length > 100) err.fullName = 'Full name must be 2 to 100 characters.'
  const phone = f.phoneNo.replace(/[\s-]/g, '')
  if (phone && !PH_MOBILE.test(phone)) err.phoneNo = 'Enter a mobile number like 09171234567, or leave it blank.'
  return err
}

/** "November 2026", or null if the date is missing/invalid. */
function memberSince(iso) {
  const d = iso ? new Date(iso) : null
  return d && !isNaN(d) ? d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }) : null
}

// Email isn't part of the editable form: it's permanent and shown read-only.
const toForm = (p) => ({ fullName: p.fullName, phoneNo: p.phoneNo ?? '' })

/** Profile (FR-005) for every role. Reads and saves /api/users/me — always the signed-in user. */
export default function Profile() {
  const { user, updateUser } = useAuth()
  const roleLabel = ROLES[user.role].label
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [loadError, setLoadError] = useState('')
  const [saved, setSaved] = useState(null)        // last values from the server
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)     // { ok, message }

  const load = useCallback(() => {
    setStatus('loading')
    api('/users/me')
      .then((p) => { setSaved(p); setForm(toForm(p)); setStatus('ready') })
      .catch((e) => { setLoadError(e.message); setStatus('error') })
  }, [])
  useEffect(load, [load])

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value })
    setErrors({ ...errors, [k]: null })
    setResult(null)
  }

  const dirty = form && saved && JSON.stringify(form) !== JSON.stringify(toForm(saved))

  const save = async (e) => {
    e.preventDefault()
    setResult(null)
    const err = validate(form)
    setErrors(err)
    if (Object.keys(err).length) return
    setBusy(true)
    try {
      const p = await api('/users/me', {
        method: 'PUT',
        body: { fullName: form.fullName.trim(), phoneNo: form.phoneNo.replace(/[\s-]/g, '') }, // no email: it can't change
      })
      setSaved(p); setForm(toForm(p))
      updateUser({ fullName: p.fullName }) // refresh the name in the top bar
      setResult({ ok: true, message: 'Profile updated.' })
    } catch (ex) {
      if (Object.keys(ex.fieldErrors).length) setErrors(ex.fieldErrors)
      setResult({ ok: false, message: ex.message })
    } finally {
      setBusy(false)
    }
  }

  const discard = () => { setForm(toForm(saved)); setErrors({}); setResult(null) }

  return (
    <AppLayout title="Profile" description="Manage your personal information and account security." narrow>
      {status === 'loading' && <div className="card" role="status" aria-busy="true"><p className="muted">Loading your profile…</p></div>}

      {status === 'error' && (
        <EmptyState icon="offline" tone="error" title="Can’t load your profile"
          action={<button className="btn sec" onClick={load}>Try again</button>}>
          {loadError} Your details haven’t changed.
        </EmptyState>
      )}

      {status === 'ready' && (
        <div className="profile-stack">
          <section className="card profile-hero" aria-label="Account summary">
            <div className="profile-cover" aria-hidden="true" />
            <div className="profile-id">
              <span className="avatar avatar-xl" aria-hidden="true">{initials(saved.fullName)}</span>
              <div className="profile-id-text">
                <h2>{saved.fullName}</h2>
                <span className="badge b-info">{roleLabel}</span>
              </div>
            </div>
            <ul className="profile-facts">
              <li><Icon name="mail" size={17} /><span>{saved.email}</span></li>
              <li><Icon name="phone" size={17} /><span>{saved.phoneNo || <span className="muted">No mobile number</span>}</span></li>
              {memberSince(saved.createdAt) && (
                <li><Icon name="calendar" size={17} /><span>Member since {memberSince(saved.createdAt)}</span></li>
              )}
            </ul>
          </section>

          <form className="card section-card" onSubmit={save} noValidate aria-labelledby="pf-title">
            <header className="section-head">
              <span className="section-icon" aria-hidden="true"><Icon name="user" size={20} /></span>
              <div>
                <h2 id="pf-title">Personal information</h2>
                <p>Your name and contact details. Facilities use these to reach you about bookings.</p>
              </div>
            </header>

            <div className="section-body">
            {result && (
              <div className={'banner ' + (result.ok ? 'bn-ok' : 'bn-err')} role={result.ok ? 'status' : 'alert'}>
                <Icon name={result.ok ? 'check' : 'alert'} /><span>{result.message}</span>
              </div>
            )}

            <div className="form-grid">
              <Field id="pf-name" label="Full name" autoComplete="name" maxLength={100}
                value={form.fullName} onChange={set('fullName')} error={errors.fullName} />
              <Field id="pf-email" label="Email" type="email" readOnly aria-readonly="true" className="inp inp-readonly"
                value={saved.email} hint="Email can't be changed." />
              <Field id="pf-phone" label="Mobile number" optional placeholder="09XX XXX XXXX" autoComplete="tel" inputMode="tel"
                value={form.phoneNo} onChange={set('phoneNo')} error={errors.phoneNo} />
              <div className="field">
                <span className="lbl">Role</span>
                <p className="readonly">{roleLabel} <span className="muted">· set by the system administrator</span></p>
              </div>
            </div>
            </div>

            <footer className="section-foot">
              <span className="muted">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</span>
              <div className="row-start">
                <button className="btn sec" type="button" onClick={discard} disabled={busy || !dirty}>Discard</button>
                <button className="btn pri" type="submit" disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save changes'}</button>
              </div>
            </footer>
          </form>

          <ChangePasswordCard />
        </div>
      )}
    </AppLayout>
  )
}
