"use client"

import { useEffect, useRef, useState } from "react"

interface ITimelineEntry {
  period: string
  role: string
  org: string
  description: string
  stack?: string[]
  current?: boolean
}

interface ITimelineItemProps {
  entry: ITimelineEntry
}

function TimelineItem({ entry }: ITimelineItemProps) {
  const ref = useRef<HTMLLIElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.35, rootMargin: "0px 0px -120px 0px" },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <li
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}
      className="relative ml-6 pb-10 last:pb-0"
    >
      <span aria-hidden="true" className={`absolute -left-[1.9rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-background ${entry.current ? "bg-coral" : "bg-teal/60"}`} />
      <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{entry.period}</p>
      <h2 className="mt-1.5 text-lg font-semibold text-foreground">
        {entry.role}
        {entry.current && <span className="ml-2 align-middle rounded-full bg-coral/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-coral">Actuel</span>}
      </h2>
      <p className="text-sm font-medium text-teal">{entry.org}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{entry.description}</p>
      {entry.stack && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {entry.stack.map((tech) => (
            <li key={tech} className="rounded-full border border-border bg-card px-2.5 py-0.5 font-mono text-[11px] text-foreground/70">
              {tech}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

interface ITimelineProps {
  entries: ITimelineEntry[]
}

export function Timeline({ entries }: ITimelineProps) {
  return (
    <ol className="relative border-l border-border">
      {entries.map((entry, index) => (
        <TimelineItem key={`${entry.org}-${entry.period}`} entry={entry} />
      ))}
    </ol>
  )
}
