import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  disabled?: boolean
  autoFocus?: boolean
  invalid?: boolean
  /** id applied to the first cell, so an external <label htmlFor> targets it. */
  id?: string
  'aria-describedby'?: string
}

// Six-box one-time-code input matching the auth canvas (uu9SI DigitCells):
// per-digit cells, auto-advance on entry, backspace/arrow navigation, and
// paste-to-fill. The joined string is the controlled value.
export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled,
  autoFocus,
  invalid,
  id,
  'aria-describedby': describedBy,
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const chars = value.split('')

  function commit(next: string) {
    onChange(next.replace(/\D/g, '').slice(0, length))
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const next = value.split('')
    next[index] = digit ?? ''
    commit(next.join(''))
    if (digit && index < length - 1) refs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !chars[index] && index > 0) {
      event.preventDefault()
      refs.current[index - 1]?.focus()
    } else if (event.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus()
    } else if (event.key === 'ArrowRight' && index < length - 1) {
      refs.current[index + 1]?.focus()
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!digits) return
    commit(digits)
    refs.current[Math.min(digits.length, length - 1)]?.focus()
  }

  return (
    <div className="flex gap-2.5">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el
          }}
          id={index === 0 ? id : undefined}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-label={`Digit ${index + 1}`}
          value={chars[index] ?? ''}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          className={cn(
            'h-16 min-w-0 flex-1 rounded-lg border bg-background-default text-center text-2xl font-semibold text-text-primary outline-none transition-colors',
            'focus:border-state-accent-solid focus:ring-1 focus:ring-inset focus:ring-state-accent-active-alt',
            'disabled:cursor-not-allowed disabled:opacity-60',
            invalid ? 'border-state-destructive-border' : 'border-divider-regular',
          )}
        />
      ))}
    </div>
  )
}
