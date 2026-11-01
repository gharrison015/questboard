import { useCallback, useEffect, useRef, useState } from 'react'
import { pickQuestion, type Question, type Subject } from '../../content/skills'
import { dateKey } from '../../engine/dates'
import { newId } from '../../engine/ids'
import { formatCents, effectiveMoney } from '../../engine/money'
import type { Grade, Kid } from '../../engine/types'
import { earnBackRoom } from '../../engine/week'
import { useWeek } from '../../state/selectors'
import { useActions, useStore } from '../../state/store'
import { Button } from '../primitives/Button'
import { Modal } from '../primitives/Modal'
import { useToast } from '../primitives/Toaster'
import { useParent } from '../parent/useParent'

const GRADE_LABEL: Record<Grade, string> = {
  'Pre-K': 'Pre-K',
  K: 'Kindergarten',
  '1st': '1st grade',
  '2nd': '2nd grade',
  '3rd+': '3rd grade and up',
}

const MAX_MISSES = 3
const CLOSE_MS = 1000

function usedKey(kidId: string, date: string): string {
  return `earnback-used:${kidId}:${date}`
}

function loadUsed(key: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(key)
    const list: unknown = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

function saveUsed(key: string, used: Set<string>): void {
  try {
    sessionStorage.setItem(key, JSON.stringify([...used]))
  } catch {
    // Private mode or full storage: repeats are possible, nothing breaks.
  }
}

interface ChallengeModalProps {
  kid: Kid
  subject: Subject
  onClose(): void
  onHop?(): void
}

export function ChallengeModal({ kid, subject, onClose, onHop }: ChallengeModalProps) {
  const { family, now } = useStore()
  const { append } = useActions()
  const toast = useToast()
  const parent = useParent()
  const ws = useWeek(kid)
  const room = earnBackRoom(ws)
  const date = dateKey(now)
  const key = usedKey(kid.id, date)

  const draw = useCallback((): Question => {
    const used = loadUsed(key)
    return pickQuestion(kid.grade, used, Math.random, subject)
  }, [key, kid.grade, subject])

  const [q, setQ] = useState<Question>(draw)
  const [misses, setMisses] = useState(0)
  const [wrong, setWrong] = useState<Set<number>>(new Set())
  const [shaking, setShaking] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [won, setWon] = useState<number | 'read' | null>(null)
  const awarding = useRef(false)

  // Marked used after render, so a StrictMode double render never burns two ids.
  useEffect(() => {
    const used = loadUsed(key)
    if (used.has(q.id)) return
    used.add(q.id)
    saveUsed(key, used)
  }, [key, q.id])
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  const finished = won !== null || (room <= 0 && won === null)
  useEffect(() => {
    if (!finished) return
    const id = window.setTimeout(() => closeRef.current(), CLOSE_MS)
    return () => window.clearTimeout(id)
  }, [finished])

  const award = (mark: number | 'read'): void => {
    if (awarding.current || !family) return
    if (room <= 0) return
    awarding.current = true
    const per = effectiveMoney(family, kid).earnBackPerCorrect
    const amount = Math.min(per, room)
    setWon(mark)
    append([{ id: newId(), at: new Date().toISOString(), type: 'earnback.earned', kidId: kid.id, skill: subject, amount, date }])
      .then(() => {
        toast.show(`+${formatCents(amount)} earned back`)
        onHop?.()
      })
      .catch(() => {
        awarding.current = false
        setWon(null)
        toast.show('Could not save that. Try again.')
      })
  }

  const pickOption = (i: number): void => {
    if (won !== null || wrong.has(i) || q.answer === undefined) return
    if (i === q.answer) { award(i); return }
    const next = misses + 1
    setShaking(i)
    if (next >= MAX_MISSES) {
      setQ(draw())
      setMisses(0)
      setWrong(new Set())
      setNote("Let's try a different one")
      return
    }
    setMisses(next)
    setWrong(new Set(wrong).add(i))
    setNote('Try again')
  }

  const title = `${subject}, ${GRADE_LABEL[kid.grade]}`
  const gone = room <= 0 && won === null
  return (
    <Modal open title={title} onClose={onClose} className="kb-challenge">
      <p className="kb-ch-meta">{title}</p>
      {gone ? (
        <p className="kb-ch-done" role="status">You earned it all back</p>
      ) : (
        <>
          <p className="kb-ch-prompt">{q.prompt}</p>
          {q.parentConfirm ? (
            <div className="kb-ch-read">
              <p className="kb-ch-note">A grown-up checks this one</p>
              <Button onClick={() => { if (won === null) parent.confirm(() => award('read')) }} aria-disabled={won !== null}>
                Grown-up: they read it
              </Button>
            </div>
          ) : (
            <div className="kb-ch-options">
              {(q.options ?? []).map((o, i) => (
                <button
                  key={`${q.id}:${i}`}
                  type="button"
                  className="kb-ch-opt"
                  data-state={won === i ? 'right' : wrong.has(i) ? 'wrong' : undefined}
                  data-shake={shaking === i && wrong.has(i) ? 'true' : undefined}
                  disabled={wrong.has(i)}
                  aria-disabled={won !== null ? 'true' : undefined}
                  onClick={() => pickOption(i)}
                  onAnimationEnd={() => setShaking(null)}
                >
                  {o}
                </button>
              ))}
            </div>
          )}
          <p className="kb-ch-note" role="status">{note}</p>
        </>
      )}
      <Button variant="quiet" onClick={onClose}>Close</Button>
    </Modal>
  )
}
