import { useEffect, useRef, useState } from 'react'
import { getAccessToken } from '../Services/auth'
import { avatarKeyFor } from './profilePhoto'
import m1 from '../assets/art/avatars/m1.webp'
import m2 from '../assets/art/avatars/m2.webp'
import m3 from '../assets/art/avatars/m3.webp'
import f1 from '../assets/art/avatars/f1.webp'
import f2 from '../assets/art/avatars/f2.webp'
import f3 from '../assets/art/avatars/f3.webp'

// Painted portraits by Ferdinand Hodler (public domain), cropped to head and shoulders.
const AVATARS = [
  { id: 'm1', src: m1, label: 'Grey-bearded man' },
  { id: 'm2', src: m2, label: 'Man with a goatee' },
  { id: 'm3', src: m3, label: 'Man with a red beard' },
  { id: 'f1', src: f1, label: 'Woman in profile' },
  { id: 'f2', src: f2, label: 'Woman with auburn hair' },
  { id: 'f3', src: f3, label: 'Woman in a dark dress' },
]

function readChoice(key: string): string | null {
  try {
    const id = localStorage.getItem(key)
    return AVATARS.some((avatar) => avatar.id === id) ? id : null
  } catch {
    return null
  }
}

// shortcut: the choice lives in this browser's localStorage only; move it to the user profile when the API offers one.
export default function ProfileAvatar({ initial }: { initial: string }) {
  const key = avatarKeyFor(getAccessToken())
  const [choice, setChoice] = useState<string | null>(() => readChoice(key))
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const closeOnOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  function select(id: string | null) {
    try {
      if (id) localStorage.setItem(key, id)
      else localStorage.removeItem(key)
    } catch {
      // Storage blocked: the choice still applies for this visit.
    }
    setChoice(id)
    setOpen(false)
  }

  const current = AVATARS.find((avatar) => avatar.id === choice)

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Choose profile icon"
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-tray text-sm font-medium ring-offset-2 transition-shadow hover:ring-2 hover:ring-line"
      >
        {current ? <img src={current.src} alt="" className="h-full w-full object-cover" /> : initial}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose profile icon"
          className="absolute bottom-full left-0 z-30 mb-3 w-[228px] rounded-xl bg-canvas p-4 shadow-[var(--shadow-dialog)]"
        >
          <p className="text-sm font-medium">Profile icon</p>
          <p className="mt-0.5 text-xs text-ink-3">Portraits by Ferdinand Hodler</p>

          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                type="button"
                onClick={() => select(avatar.id)}
                aria-pressed={choice === avatar.id}
                aria-label={avatar.label}
                title={avatar.label}
                className={`aspect-square overflow-hidden rounded-full ring-offset-2 transition-shadow ${
                  choice === avatar.id ? 'ring-2 ring-ink' : 'hover:ring-2 hover:ring-rule'
                }`}
              >
                <img src={avatar.src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => select(null)}
            aria-pressed={choice === null}
            className="mb-rule mt-3 flex w-full items-center gap-2.5 pt-3 text-left text-sm text-ink-2 hover:text-ink"
          >
            <span className={`flex h-7 w-7 items-center justify-center rounded-full bg-tray text-xs font-medium text-ink ${choice === null ? 'ring-2 ring-ink ring-offset-2' : ''}`}>
              {initial}
            </span>
            Use my initial
          </button>
        </div>
      )}
    </div>
  )
}
