import { Icon } from './Icon'

interface KeypadProps {
  onDigit(d: string): void
  onDelete(): void
}

const ROWS = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']]

export function Keypad({ onDigit, onDelete }: KeypadProps) {
  return (
    <div className="qb-keypad" role="group" aria-label="Number pad">
      {ROWS.flat().map((d) => (
        <button key={d} type="button" className="qb-key" onClick={() => onDigit(d)}>{d}</button>
      ))}
      <span aria-hidden="true" />
      <button type="button" className="qb-key" onClick={() => onDigit('0')}>0</button>
      <button type="button" className="qb-key" aria-label="Delete" onClick={onDelete}><Icon name="x" /></button>
    </div>
  )
}
