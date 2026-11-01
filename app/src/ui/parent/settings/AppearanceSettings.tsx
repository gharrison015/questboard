import type { Appearance } from '../../../engine/types'
import type { DeviceSettings } from '../../../storage/adapter'
import { useActions, useStore } from '../../../state/store'
import { useToast } from '../../primitives/Toaster'
import { useSave } from './fields'

const LOOKS: [Appearance, string][] = [['bright', 'Bright'], ['calm', 'Calm'], ['dark', 'Dark'], ['auto', 'Auto']]
const MODES: [DeviceSettings['modeOverride'], string][] = [['auto', 'Auto'], ['phone', 'Phone'], ['tablet', 'Tablet'], ['tv', 'TV']]

export function AppearanceSettings() {
  const { family, device } = useStore()
  const { setDevice } = useActions()
  const toast = useToast()
  const save = useSave()
  if (!family) return null
  const saveDevice = (patch: Partial<DeviceSettings>): void => {
    setDevice(patch).then(() => toast.show('Saved')).catch(() => toast.show('Could not save that. Try again.'))
  }
  return (
    <div className="st-body">
      <div role="radiogroup" aria-label="Appearance" className="st-chips">
        {LOOKS.map(([key, label]) => (
          <label key={key} className="st-chip" data-on={family.appearance === key}>
            <input type="radio" className="st-sr" name="appearance" checked={family.appearance === key} onChange={() => { void save({ type: 'appearance.set', appearance: key }) }} />
            {label}
          </label>
        ))}
      </div>
      <p className="st-hint">Auto turns dark in the evening on the TV board and stays bright elsewhere.</p>

      <h4 className="pr-sub">This device only</h4>
      <p className="st-hint">These two settings apply only to this device. Other devices keep the family setting.</p>
      <div className="st-grid">
        <div className="st-field">
          <label htmlFor="dev-look" className="st-label">Appearance on this device</label>
          <select
            id="dev-look"
            className="st-input"
            value={device.appearanceOverride ?? ''}
            onChange={(e) => saveDevice({ appearanceOverride: e.target.value === '' ? null : (e.target.value as Appearance) })}
          >
            <option value="">Same as family</option>
            {LOOKS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
        <div className="st-field">
          <label htmlFor="dev-mode" className="st-label">Layout on this device</label>
          <select id="dev-mode" className="st-input" value={device.modeOverride} onChange={(e) => saveDevice({ modeOverride: e.target.value as DeviceSettings['modeOverride'] })}>
            {MODES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}
