import type { HotkeySequence } from '@tanstack/react-hotkeys'

export type NavigationShortcut = {
  id: string
  sequence: HotkeySequence
  path: string
  name: string
  description: string
  displayKeys: string
}

export const NAVIGATION_SHORTCUTS = [
  {
    id: 'nav.dashboard',
    sequence: ['G', 'D'],
    path: '/',
    name: 'Go to Today',
    description: 'Navigate to Today.',
    displayKeys: 'G then D',
  },
  {
    id: 'nav.obligations',
    sequence: ['G', 'W'],
    path: '/deadlines',
    name: 'Go to Deadlines',
    description: 'Navigate to Deadlines.',
    displayKeys: 'G then W',
  },
  {
    id: 'nav.inbox',
    sequence: ['G', 'I'],
    path: '/notifications',
    name: "What's new",
    description: 'Open the Inbox — Alerts, reminders, and system notifications.',
    displayKeys: 'G then I',
  },
  {
    id: 'nav.clients',
    sequence: ['G', 'C'],
    path: '/clients',
    name: 'Go to Clients',
    description: 'Navigate to the client directory.',
    displayKeys: 'G then C',
  },
  {
    id: 'nav.workload',
    sequence: ['G', 'T'],
    path: '/workload',
    name: 'Go to Team workload',
    description: 'Navigate to the team workload surface.',
    displayKeys: 'G then T',
  },
] as const satisfies readonly NavigationShortcut[]
