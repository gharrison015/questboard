const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Clock and date from the store's minute tick. "9:05" with a small am or pm, then "Sunday, November 1". */
export function TvClock({ now }: { now: Date }) {
  const h = now.getHours()
  const hour12 = h % 12 === 0 ? 12 : h % 12
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return (
    <div className="tv-clock">
      <time className="tv-clock-time" dateTime={now.toISOString()}>
        {hour12}:{minutes}<small>{h < 12 ? 'am' : 'pm'}</small>
      </time>
      <p className="tv-date">{DAYS[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}</p>
    </div>
  )
}
