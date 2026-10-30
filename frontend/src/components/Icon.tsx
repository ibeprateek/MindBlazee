const paths = {
  overview: 'M4 5h7v6H4zM13 5h7v3h-7zM13 10h7v9h-7zM4 13h7v6H4z',
  tasks: 'M5 5h14v14H5zM8.5 12l2.5 2.5L16 9.5',
  focus: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 1.5M10 3h4',
  logs: 'M7 4h10v16H7zM10 8h4M10 12h4M10 16h2',
  analytics: 'M4 20h16M7 16v-4M12 16V8M17 16v-7',
  plus: 'M12 5v14M5 12h14',
  edit: 'M5 19h4L19 9l-4-4L5 15zM13 7l4 4',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12',
  logout: 'M10 5H5v14h5M14 8l4 4-4 4M18 12H9',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  close: 'M6 6l12 12M18 6L6 18',
  spark: 'M12 4v4M12 16v4M4 12h4M16 12h4M7 7l2 2M15 15l2 2M17 7l-2 2M9 15l-2 2',
} as const

export type IconName = keyof typeof paths

export default function Icon({
  name,
  size = 18,
  className = '',
}: {
  name: IconName
  size?: number
  className?: string
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={paths[name]} />
    </svg>
  )
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 22 22">
        <circle cx="11" cy="11" r="4.2" fill="currentColor" />
        <path d="M1.5 15.5h19" stroke="currentColor" strokeWidth="1.8" />
        <path d="M1.5 19.5h19" stroke="currentColor" strokeWidth="1.8" strokeDasharray="2.4 2.2" />
      </svg>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-[0.32em]">MINDBLAZE</span>
      )}
    </span>
  )
}
