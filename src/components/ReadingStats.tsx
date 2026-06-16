import { useState, useEffect, useMemo } from 'react'
import { BookEntry } from '../types'
import { loadReadingTimeRange, loadBookReadingTimeRange, loadSetting, BookReadingTimeRecord } from '../utils/db'
import { BarChart3, BookOpen, CheckCircle2 } from 'lucide-react'
import '../styles/components/reading-stats.css'

const statCardBg = 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.08) 100%)'

interface ReadingStatsProps {
  books: BookEntry[]
}

function GoalBar({ secs, goalMin }: { secs: number; goalMin: number }) {
  const pct = Math.min(100, Math.round((secs / 60 / goalMin) * 100))
  return (
    <div className="stat-goal-bar">
      <div className="stat-goal-fill">
        <div
          className={`stat-goal-progress ${pct >= 100 ? 'achieved' : 'active'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="stat-goal-label">
        {pct >= 100 ? <><CheckCircle2 size={14} /> 已达标</> : `${pct}%`}
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
    <div className="stats-container">
      <h2 className="stats-title"><BarChart3 size={18} /> 阅读统计</h2>

      {!loaded ? (
        <div className="shared-loading">
          <div className="shared-spinner" />
          <span className="shared-loading-text">加载中...</span>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            {[
              { label: '今日', value: todaySecs },
              { label: '本周', value: weekSecs },
              { label: '本月', value: monthSecs },
              { label: goalMin > 0 ? '今日目标' : '总计', value: goalMin > 0 ? todaySecs : totalSecs },
            ].map((item, i) => (
              <div key={item.label} className={`stat-card${i === 3 && goalMin > 0 ? ' accent' : ''}`}>
                <div className="stat-label">
                  {item.label}
                </div>
                <div className="stat-value">
                  {goalMin > 0 && i === 3 ? `${Math.floor(item.value / 60)}m / ${goalMin}m` : formatDuration(item.value)}
                </div>
                {goalMin > 0 && i === 3 && <GoalBar secs={item.value} goalMin={goalMin} />}
              </div>
            ))}
          </div>

          {/* bar chart */}
          <div className="chart-container">
            <div className="chart-title">
              近 14 天阅读趋势
            </div>
            <div className="chart-bars">
              {chartData.map((d) => {
                const pct = (d.seconds / maxSecs) * 100
                return (
                  <div key={d.date} className="chart-bar-wrapper">
                    <div
                      className="chart-bar"
                      style={{
                        height: `${Math.max(pct, 1)}%`,
                        minHeight: d.seconds > 0 ? undefined : 2,
                      }}
                      title={`${d.date}: ${formatDuration(d.seconds)}`}
                    />
                    <div className="chart-bar-label">
                      {d.date.slice(8)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* per-book */}
          {bookTotals.length > 0 && (
            <div className="stats-book-list">
              <div className="stats-book-list-title">
                每本书阅读时间
              </div>
              {bookTotals.map((bt, i) => (
                <div key={bt.filePath} className={`stats-book-row${i < bookTotals.length - 1 ? ' stats-book-divider' : ''}`}>
                  <span className="stats-book-icon"><BookOpen size={14} /></span>
                  <span className="stats-book-title">
                    {getBookTitle(bt.filePath)}
                  </span>
                  <span className="stats-book-duration">
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