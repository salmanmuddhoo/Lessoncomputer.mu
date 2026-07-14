'use client'

import { useMemo, useState } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay,
  eachDayOfInterval, addMonths, addWeeks, addDays, format, isSameMonth, isToday,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Video, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { occurrencesInRange, endForOccurrence, type OccurrenceClass } from '@/lib/live-class-occurrences'

export interface CalendarClass extends OccurrenceClass {
  id: string
  title: string
  meet_url?: string | null
  is_published?: boolean
  grade: { name: string; color: string } | null
}

type View = 'month' | 'week' | 'day'

interface Occ { cls: CalendarClass; start: Date; end: Date | null }

const WEEK_OPTS = { weekStartsOn: 1 as const } // Monday
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function timeLabel(occ: Occ) {
  const s = format(occ.start, 'h:mm a')
  return occ.end ? `${s} – ${format(occ.end, 'h:mm a')}` : s
}

function openMeet(url?: string | null) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer')
}

export function LiveClassCalendar({ classes }: { classes: CalendarClass[] }) {
  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState(() => new Date())

  const range = useMemo(() => {
    if (view === 'month') {
      return { start: startOfWeek(startOfMonth(cursor), WEEK_OPTS), end: endOfWeek(endOfMonth(cursor), WEEK_OPTS) }
    }
    if (view === 'week') {
      return { start: startOfWeek(cursor, WEEK_OPTS), end: endOfWeek(cursor, WEEK_OPTS) }
    }
    return { start: startOfDay(cursor), end: endOfDay(cursor) }
  }, [view, cursor])

  // Group occurrences by day key (yyyy-MM-dd)
  const byDay = useMemo(() => {
    const map = new Map<string, Occ[]>()
    for (const cls of classes) {
      for (const start of occurrencesInRange(cls, range.start, range.end)) {
        const key = format(start, 'yyyy-MM-dd')
        const occ: Occ = { cls, start, end: endForOccurrence(cls, start) }
        const arr = map.get(key)
        if (arr) arr.push(occ)
        else map.set(key, [occ])
      }
    }
    for (const arr of map.values()) arr.sort((a, b) => a.start.getTime() - b.start.getTime())
    return map
  }, [classes, range])

  function shift(dir: -1 | 1) {
    setCursor((c) => (view === 'month' ? addMonths(c, dir) : view === 'week' ? addWeeks(c, dir) : addDays(c, dir)))
  }

  const title =
    view === 'month' ? format(cursor, 'MMMM yyyy')
    : view === 'week' ? `${format(range.start, 'd MMM')} – ${format(range.end, 'd MMM yyyy')}`
    : format(cursor, 'EEEE, d MMMM yyyy')

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap p-3 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => shift(-1)} aria-label="Previous"><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Today</Button>
          <Button variant="outline" size="sm" onClick={() => shift(1)} aria-label="Next"><ChevronRight className="w-4 h-4" /></Button>
          <span className="ml-2 font-semibold text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border/60 p-0.5">
          {(['day', 'week', 'month'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/40'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'month' && <MonthView cursor={cursor} range={range} byDay={byDay} />}
      {view === 'week' && <WeekView range={range} byDay={byDay} />}
      {view === 'day' && <DayView cursor={cursor} byDay={byDay} />}
    </div>
  )
}

function Chip({ occ }: { occ: Occ }) {
  const color = occ.cls.grade?.color ?? '#888'
  return (
    <button
      onClick={() => openMeet(occ.cls.meet_url)}
      title={`${occ.cls.grade?.name ?? 'Live class'} · ${timeLabel(occ)}${occ.cls.title ? ' · ' + occ.cls.title : ''}`}
      className={`w-full flex items-center gap-1 px-1.5 py-1 rounded text-left text-[11px] leading-tight ${
        occ.cls.meet_url ? 'hover:bg-muted/60 cursor-pointer' : 'cursor-default'
      } ${occ.cls.is_published === false ? 'opacity-50' : ''}`}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="font-medium shrink-0">{format(occ.start, 'h:mm')}</span>
      <span className="truncate" style={{ color }}>{occ.cls.grade?.name ?? 'Live class'}</span>
    </button>
  )
}

function MonthView({ cursor, range, byDay }: { cursor: Date; range: { start: Date; end: Date }; byDay: Map<string, Occ[]> }) {
  const days = eachDayOfInterval({ start: range.start, end: range.end })
  return (
    <div>
      <div className="grid grid-cols-7 border-b border-border/60 bg-muted/10">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-[11px] font-medium text-muted-foreground text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const occ = byDay.get(format(day, 'yyyy-MM-dd')) ?? []
          const dim = !isSameMonth(day, cursor)
          return (
            <div key={day.toISOString()} className={`min-h-[92px] border-b border-r border-border/40 p-1 ${dim ? 'bg-muted/10' : ''}`}>
              <div className={`text-[11px] font-medium mb-1 flex justify-end ${dim ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                <span className={isToday(day) ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground' : ''}>
                  {format(day, 'd')}
                </span>
              </div>
              <div className="space-y-0.5">
                {occ.slice(0, 3).map((o, i) => <Chip key={i} occ={o} />)}
                {occ.length > 3 && <p className="text-[10px] text-muted-foreground pl-1.5">+{occ.length - 3} more</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekView({ range, byDay }: { range: { start: Date; end: Date }; byDay: Map<string, Occ[]> }) {
  const days = eachDayOfInterval({ start: range.start, end: range.end })
  return (
    <div className="grid grid-cols-1 sm:grid-cols-7">
      {days.map((day) => {
        const occ = byDay.get(format(day, 'yyyy-MM-dd')) ?? []
        return (
          <div key={day.toISOString()} className="border-b sm:border-r border-border/40 min-h-[120px]">
            <div className={`px-2 py-2 text-xs font-medium border-b border-border/40 flex items-center gap-1.5 ${isToday(day) ? 'text-primary' : 'text-muted-foreground'}`}>
              <span className="uppercase">{format(day, 'EEE')}</span>
              <span className={isToday(day) ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground' : ''}>{format(day, 'd')}</span>
            </div>
            <div className="p-1 space-y-0.5">
              {occ.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/50 px-1.5 py-1">—</p>
              ) : occ.map((o, i) => <Chip key={i} occ={o} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DayView({ cursor, byDay }: { cursor: Date; byDay: Map<string, Occ[]> }) {
  const occ = byDay.get(format(cursor, 'yyyy-MM-dd')) ?? []
  if (occ.length === 0) {
    return <div className="py-16 text-center text-sm text-muted-foreground">No live classes on this day.</div>
  }
  return (
    <div className="divide-y divide-border/40">
      {occ.map((o, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: o.cls.grade?.color ?? '#888' }} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm flex items-center gap-2 flex-wrap">
              <span style={{ color: o.cls.grade?.color ?? undefined }}>{o.cls.grade?.name ?? 'Live class'}</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground font-normal"><Clock className="w-3 h-3" /> {timeLabel(o)}</span>
              {o.cls.is_published === false && <span className="text-amber-600 font-normal">· Draft</span>}
            </p>
            {o.cls.title && <p className="text-xs text-muted-foreground truncate">{o.cls.title}</p>}
          </div>
          {o.cls.meet_url && (
            <Button size="sm" variant="outline" onClick={() => openMeet(o.cls.meet_url)}>
              <Video className="w-3.5 h-3.5 mr-1" /> Join
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
