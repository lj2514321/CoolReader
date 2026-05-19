import { useState, useEffect, useMemo } from 'react'
import { BookEntry } from '../types'
import { loadReadingTimeRange, loadBookReadingTimeRange, loadSetting, BookReadingTimeRecord } from '../utils/db'

const statCardBg = 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.08) 100%)'

interface ReadingStatsProps {
  books: BookEntry[]
}

function GoalBar({ secs, goalMin }: { secs: number; goalMin: number }) {
  const pct = Math.min(100, Math.round((secs / 60 / goalMin) * 100))
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{
        height: 4, borderRadius: 2,
        background: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          borderRadius: 2,
          background: pct >= 100
            ? 'linear-gradient(90deg, #22c55e, #16a34a)'
            : 'linear-gradient(90deg, rgba(99,102,241,0.7), rgba(168,85,247,0.6))',
          transition: 'width 0.3s ease',
        }} />
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
        {pct >= 100 ? '🎉 已达标' : `${pct}%`}
      </div>
    </div>
  )
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function getWeekDates(): string[] {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(now)
  mon.setDate(now.getDate() + diff)
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

function getMonthDates(): string[] {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const dates: string[] = []
  const d = new Date(first)
  while (d.getMonth() === now.getMonth()) {
    dates.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return dates
}

function sumDatesReadingTime(data: { date: string; seconds: number }[], dates: string[]): number {
  let total = 0
  for (const d of dates) {
    const found = data.find(r => r.date === d)
    if (found) total += found.seconds
  }
  return total
}

export function ReadingStats({ books }: ReadingStatsProps) {
  const [dailyData, setDailyData] = useState<{ date: string; seconds: number }[]>([])
  const [bookData, setBookData] = useState<BookReadingTimeRecord[]>([])
  const [loaded, setLoaded] = useState(false)
  const [goalMin, setGoalMin] = useState(0)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    const past = new Date()
    past.setDate(past.getDate() - 30)
    const from = past.toISOString().slice(0, 10)

    Promise.all([
      loadReadingTimeRange(from, today),
      loadBookReadingTimeRange(from, today),
      loadSetting('readingGoal'),
    ]).then(([totalRange, bookRange, goalRaw]) => {
      setDailyData(totalRange)
      setBookData(bookRange)
      if (goalRaw) {
        try { setGoalMin(JSON.parse(goalRaw).dailyMinutes || 0) } catch { setGoalMin(0) }
      }
      setLoaded(true)
    })
  }, [])

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const weekDates = useMemo(() => getWeekDates(), [])
  const monthDates = useMemo(() => getMonthDates(), [])

  const todaySecs = useMemo(() => dailyData.find(r => r.date === todayStr)?.seconds ?? 0, [dailyData, todayStr])
  const weekSecs = useMemo(() => sumDatesReadingTime(dailyData, weekDates), [dailyData, weekDates])
  const monthSecs = useMemo(() => sumDatesReadingTime(dailyData, monthDates), [dailyData, monthDates])
  const totalSecs = useMemo(() => dailyData.reduce((s, r) => s + r.seconds, 0), [dailyData])

  // 14-day chart data
  const chartData = useMemo(() => {
    const data: { date: string; seconds: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const ds = d.toISOString().slice(0, 10)
      const found = dailyData.find(r => r.date === ds)
      data.push({ date: ds, seconds: found?.seconds ?? 0 })
    }
    return data
  }, [dailyData])
  const maxSecs = useMemo(() => Math.max(...chartData.map(d => d.seconds), 1), [chartData])

  // per-book totals
  const bookTotals: { filePath: string; seconds: number }[] = []
  const bookMap = new Map<string, number>()
  for (const r of bookData) {
    bookMap.set(r.filePath, (bookMap.get(r.filePath) || 0) + r.seconds)
  }
  bookMap.forEach((secs, filePath) => bookTotals.push({ filePath, seconds: secs }))
  bookTotals.sort((a, b) => b.seconds - a.seconds)

  const getBookTitle = (fp: string) => {
    const b = books.find(b => b.filePath === fp)
    return b?.meta.title || fp.split('\\').pop()?.split('/').pop() || fp
  }

  return (
    <div style={{ padding: '28px 36px 32px 24px', height: '100%', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <h2 style={{ margin: '0 0 24px', color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>
        📊 阅读统计
      </h2>

      {!loaded ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, padding: 40, textAlign: 'center' }}>加载中...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
            {[
              { label: '今日', value: todaySecs },
              { label: '本周', value: weekSecs },
              { label: '本月', value: monthSecs },
              { label: goalMin > 0 ? '今日目标' : '总计', value: goalMin > 0 ? todaySecs : totalSecs },
            ].map((item, i) => (
              <div key={item.label} style={{
                padding: '16px 18px',
                borderRadius: 12,
                background: statCardBg,
                border: i === 3 && goalMin > 0 ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(168,85,247,0.12)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 500, marginBottom: 6 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: -0.3 }}>
                  {goalMin > 0 && i === 3 ? `${Math.floor(item.value / 60)}m / ${goalMin}m` : formatDuration(item.value)}
                </div>
                {goalMin > 0 && i === 3 && <GoalBar secs={item.value} goalMin={goalMin} />}
              </div>
            ))}
          </div>

          {/* bar chart */}
          <div style={{
            padding: '20px 24px',
            borderRadius: 12,
            background: statCardBg,
            border: '1px solid rgba(168,85,247,0.12)',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 14 }}>
              近 14 天阅读趋势
            </div>
            <div style={{ display: 'flex', height: 140, gap: 6 }}>
              {chartData.map((d, i) => {
                const pct = (d.seconds / maxSecs) * 100
                return (
                  <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 4, height: '100%' }}>
                    <div style={{
                      width: '100%',
                      height: `${Math.max(pct, 1)}%`,
                      borderRadius: '4px 4px 0 0',
                      background: 'linear-gradient(180deg, rgba(99,102,241,0.6) 0%, rgba(168,85,247,0.4) 100%)',
                      transition: 'height 0.3s ease',
                      minHeight: d.seconds > 0 ? undefined : 2,
                      position: 'relative',
                    }}
                      title={`${d.date}: ${formatDuration(d.seconds)}`}
                    />
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                      {d.date.slice(8)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* per-book */}
          {bookTotals.length > 0 && (
            <div style={{
              padding: '20px 24px',
              borderRadius: 12,
              background: statCardBg,
              border: '1px solid rgba(168,85,247,0.12)',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>
                每本书阅读时间
              </div>
              {bookTotals.map((bt, i) => (
                <div key={bt.filePath} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0',
                  borderBottom: i < bookTotals.length - 1 ? '1px solid rgba(255,255,255,0.05)' : undefined,
                }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>📖</span>
                  <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getBookTitle(bt.filePath)}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                    {formatDuration(bt.seconds)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
