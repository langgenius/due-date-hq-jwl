import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ReminderTemplatePublic } from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

const rpcMocks = vi.hoisted(() => ({
  listTemplatesFn: vi.fn(),
  updateTemplateFn: vi.fn(),
}))

vi.mock('@/lib/rpc', () => ({
  orpc: {
    reminders: {
      key: () => ['reminders'],
      listTemplates: {
        queryOptions: () => ({
          queryKey: ['reminders', 'listTemplates'],
          queryFn: async () => rpcMocks.listTemplatesFn(),
        }),
      },
      updateTemplate: {
        mutationOptions: (opts: { onSuccess?: () => void }) => ({
          mutationFn: async (input: unknown) => {
            const result = rpcMocks.updateTemplateFn(input)
            return result
          },
          onSuccess: opts.onSuccess,
        }),
      },
    },
  },
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { ReminderTemplateEditorPage } from './reminder-template-editor-page'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const TEMPLATE: ReminderTemplatePublic = {
  id: 'tpl_1',
  firmId: 'firm_1',
  templateKey: 'client-deadline-30-day-reminder',
  kind: 'client_deadline_reminder',
  name: '1040 prep · round 1',
  subject: 'Quick nudge — your 1040 docs',
  bodyText: 'Hi {{client_name}}, friendly reminder before {{deadline_date}}.',
  active: true,
  isSystem: false,
  usageCount: 84,
  lastSentAt: null,
  createdAt: null,
  updatedAt: null,
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  bootstrapI18n()
  activateLocale('en')
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  rpcMocks.listTemplatesFn.mockReset()
  rpcMocks.updateTemplateFn.mockReset()
  rpcMocks.updateTemplateFn.mockResolvedValue(TEMPLATE)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function render(search: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await act(async () => {
    root.render(
      <AppI18nProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[search]}>
            <ReminderTemplateEditorPage />
          </MemoryRouter>
        </QueryClientProvider>
      </AppI18nProvider>,
    )
  })
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!container.querySelector('[aria-busy="true"]')) break
    // eslint-disable-next-line no-await-in-loop -- sequential render flush is intentional
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }
}

function setValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement
  // eslint-disable-next-line @typescript-eslint/unbound-method -- native value setter is re-bound via Reflect.apply below
  const setter = Object.getOwnPropertyDescriptor(proto.prototype, 'value')?.set
  if (setter) Reflect.apply(setter, el, [value])
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('ReminderTemplateEditorPage', () => {
  it('loads the template named in the query string and saves edits', async () => {
    rpcMocks.listTemplatesFn.mockResolvedValue([TEMPLATE])
    await render('/settings/reminders/templates/edit?template=client-deadline-30-day-reminder')

    // The subject input is seeded from the template.
    const subjectInput = Array.from(container.querySelectorAll('input')).find(
      (input) => input.value === TEMPLATE.subject,
    )
    expect(subjectInput).toBeDefined()

    // Editing the subject enables Save, and submit calls updateTemplate.
    await act(async () => {
      setValue(subjectInput!, 'Updated subject')
    })

    const form = container.querySelector('form')
    expect(form).not.toBeNull()
    await act(async () => {
      form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(rpcMocks.updateTemplateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        templateKey: 'client-deadline-30-day-reminder',
        subject: 'Updated subject',
      }),
    )
  })

  it('shows a not-found alert when the template key is unknown', async () => {
    rpcMocks.listTemplatesFn.mockResolvedValue([TEMPLATE])
    await render('/settings/reminders/templates/edit?template=does-not-exist')
    expect(container.textContent).toContain('Template not found')
  })
})
