import { describe, expect, it } from 'vitest'
import { extractOfficialSourceText } from './source-text'

describe('rule source text extraction', () => {
  it('keeps expanded FAQ answers that are present in the page HTML', () => {
    const html = `
      <html>
        <body>
          <nav>Forms Rules Make A Payment</nav>
          <main>
            <h1>When should I file my Alabama Individual Income Tax Return?</h1>
            <button aria-expanded="false">When should I file my Alabama Individual Income Tax Return?</button>
            <div hidden>
              <p>Generally, your Alabama Individual Income Tax Return is due on April 15th, unless the 15th is a weekend or holiday, then the return is due the next business day.</p>
            </div>
          </main>
        </body>
      </html>
    `

    const text = extractOfficialSourceText(html)

    expect(text).toContain('When should I file my Alabama Individual Income Tax Return?')
    expect(text).toContain(
      'Generally, your Alabama Individual Income Tax Return is due on April 15th',
    )
    expect(text).not.toContain('Forms Rules Make A Payment')
  })

  it('extracts FAQPage JSON-LD answers before removing scripts', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "When should I file?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Returns are due April 15 unless the date falls on a weekend or holiday."
                  }
                }
              ]
            }
          </script>
        </head>
        <body><main><h1>FAQ</h1></main></body>
      </html>
    `

    const text = extractOfficialSourceText(html)

    expect(text).toContain('Question: When should I file?')
    expect(text).toContain(
      'Answer: Returns are due April 15 unless the date falls on a weekend or holiday.',
    )
  })

  it('keeps due-date table rows as source-backed excerpt text', () => {
    const html = `
      <html>
        <body>
          <main>
            <h1>Due Dates</h1>
            <p>Some Income Taxes have set due dates and others vary by situation. See table below.</p>
            <table>
              <thead>
                <tr><th>Tax Type</th><th>Due Date</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Individual Income Tax</td>
                  <td>Due the same date as the corresponding federal income tax return.</td>
                </tr>
                <tr>
                  <td>S-Corporation</td>
                  <td>Due annually on March 15 for calendar year taxpayers.</td>
                </tr>
              </tbody>
            </table>
          </main>
        </body>
      </html>
    `

    const text = extractOfficialSourceText(html)

    expect(text).toContain(
      'Individual Income Tax Due the same date as the corresponding federal income tax return.',
    )
    expect(text).toContain('S-Corporation Due annually on March 15 for calendar year taxpayers.')
  })
})
