import { cn } from '@duedatehq/ui/lib/utils'

/**
 * Third-party provider brand marks — Google, Microsoft, Apple, Outlook — for the
 * SSO sign-in buttons and the /calendar integration cards.
 *
 * These intentionally use each provider's OFFICIAL brand colours (raw hex). Brand
 * logos are the one sanctioned exception to the tokens-only rule: a third-party
 * mark must not be recoloured to the product palette, or it stops reading as that
 * brand. (AppleGlyph is the exception to the exception — Apple's mark is
 * monochrome, so it inherits `currentColor`.)
 *
 * All accept a `className` and default to an 18px square so they drop into a
 * Button's icon slot; pass `className="size-5"` etc. to resize.
 */

export function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={cn('size-[18px]', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.6 6.1 29 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5Z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 16 19 13 24 13c3 0 5.7 1.1 7.8 3l5.7-5.7C33.6 6.1 29 4 24 4 16.3 4 9.7 8.3 6.3 14.7Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c4.9 0 9.4-1.9 12.8-5l-5.9-5c-2 1.4-4.5 2.2-7 2.2-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.1 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l5.9 5c-.4.4 6.4-4.7 6.4-14.5 0-1.3-.1-2.4-.4-3.5Z"
      />
    </svg>
  )
}

export function MicrosoftGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 23 23"
      aria-hidden="true"
      className={cn('size-[18px]', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path fill="#f25022" d="M1 1h10v10H1z" />
      <path fill="#7fba00" d="M12 1h10v10H12z" />
      <path fill="#00a4ef" d="M1 12h10v10H1z" />
      <path fill="#ffb900" d="M12 12h10v10H12z" />
    </svg>
  )
}

export function AppleGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
      className={cn('size-[18px] text-text-primary', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
    </svg>
  )
}

export function OutlookGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn('size-[18px]', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outlook mark: the brand-blue "O" overlapping a blue envelope. */}
      <rect x="11.5" y="7" width="10" height="10" rx="1.2" fill="#0F6CBD" />
      <path d="M12 8.4 16.5 11.7 21 8.4" fill="none" stroke="#fff" strokeWidth="1.2" />
      <ellipse cx="8" cy="12" rx="6.4" ry="7" fill="#fff" />
      <ellipse cx="8" cy="12" rx="6.4" ry="7" fill="none" stroke="#0F6CBD" strokeWidth="2.4" />
    </svg>
  )
}
