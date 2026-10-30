import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import lakeMirror from '../assets/art/lake-mirror.webp'
import { Wordmark } from './Icon'

const tags = [
  { label: 'Focus', color: 'var(--color-blue-ink)', position: 'left-[20%] top-[44%]' },
  { label: 'Breaks', color: 'var(--color-violet-ink)', position: 'left-[74%] top-[42%]' },
  { label: 'Workload', color: 'var(--color-pink-ink)', position: 'left-[46%] top-[50%]' },
]

export default function AuthLayout({
  title,
  titleQuiet,
  subtitle,
  children,
  footer,
}: {
  title: string
  titleQuiet: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <main className="flex min-h-screen flex-col gap-3 bg-canvas p-3 sm:p-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-4">
      <section className="mb-frame flex flex-1 flex-col px-6 py-6 sm:px-10 sm:py-8">
        <Link to="/" className="w-fit">
          <Wordmark />
        </Link>

        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-12">
          <h1 className="mb-display">{title} <span className="mb-quiet">{titleQuiet}</span></h1>
          <p className="mt-3 text-base leading-relaxed text-ink-2">{subtitle}</p>
          {children}
        </div>

        <div className="text-center text-sm text-ink-2">{footer}</div>
      </section>

      <aside className="relative order-first h-44 overflow-hidden rounded-2xl bg-wash sm:h-56 lg:order-none lg:h-auto">
        <img
          src={lakeMirror}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[50%_40%]"
        />
        <div aria-hidden="true" className="hidden lg:block">
          {tags.map((tag) => (
            <span
              key={tag.label}
              className={`mb-tag ${tag.position}`}
              style={{ '--tag': tag.color } as CSSProperties}
            >
              {tag.label}
            </span>
          ))}
        </div>
        <p className="absolute bottom-3 left-3 rounded-full bg-white/85 px-3 py-1 text-xs text-ink-2">
          Ferdinand Hodler, <i>Lake Thun</i>, 1909
        </p>
      </aside>
    </main>
  )
}
