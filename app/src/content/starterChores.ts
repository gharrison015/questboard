export interface StarterChore {
  label: string
  /** A name from choreIcons. */
  icon: string
  /** 0 is Sunday. */
  days: number[]
  preChecked: boolean
  /** Gets the money preset's pay amount. Every other starter chore pays nothing. */
  paid?: boolean
}

const ALL = [0, 1, 2, 3, 4, 5, 6]

export const STARTER_CHORES: StarterChore[] = [
  { label: 'Make your bed', icon: 'bed', days: ALL, preChecked: true },
  { label: 'Put toys away', icon: 'toys', days: ALL, preChecked: true },
  { label: 'Clear your plate', icon: 'plate', days: ALL, preChecked: true },
  { label: 'Feed a pet', icon: 'dog', days: ALL, preChecked: true },
  { label: 'Put clothes in hamper', icon: 'hamper', days: ALL, preChecked: true },
  { label: 'Homework folder', icon: 'homework', days: [1, 2, 3, 4], preChecked: false },
  { label: 'Take out trash', icon: 'trash', days: [2, 5], preChecked: false, paid: true },
  { label: 'Set the table', icon: 'table', days: ALL, preChecked: false },
  { label: 'Water the plants', icon: 'plant', days: [3, 6], preChecked: false },
  { label: 'Help with laundry', icon: 'laundry', days: [6], preChecked: false },
  { label: 'Tidy your room', icon: 'broom', days: [0, 3], preChecked: false },
  { label: 'Read 20 minutes', icon: 'book', days: [1, 2, 3, 4, 5], preChecked: false },
]
