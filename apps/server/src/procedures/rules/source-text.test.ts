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

  it('normalizes Alabama business privilege tax ordinal rows', () => {
    const html = `
      <html>
        <body>
          <main>
            <h1>Income Tax Due Dates</h1>
            <table>
              <tbody>
                <tr>
                  <td>Business Privilege Tax</td>
                  <td>C-Corporation</td>
                  <td>Due no later than 15^{th} day of the 4^{th} month after the beginning of a taxpayer's taxable year.</td>
                </tr>
                <tr>
                  <td>Business Privilege Tax</td>
                  <td>S-Corporation</td>
                  <td>Due no later than 15 <sup>th</sup> day of the 3 <sup>rd</sup> month after the beginning of a taxpayer's taxable year.</td>
                </tr>
              </tbody>
            </table>
          </main>
        </body>
      </html>
    `

    const text = extractOfficialSourceText(html)

    expect(text).toContain(
      "Business Privilege Tax C-Corporation Due no later than 15th day of the 4th month after the beginning of a taxpayer's taxable year.",
    )
    expect(text).toContain(
      "Business Privilege Tax S-Corporation Due no later than 15th day of the 3rd month after the beginning of a taxpayer's taxable year.",
    )
  })

  it('falls back to full page text when shallow content selectors miss nested accordions', () => {
    const html = `
      <html>
        <body>
          <div id="main-content">
            <main id="main">
              <div id="overview">
                <p>Our due dates apply to both calendar and fiscal tax years.</p>
              </div>
              <ol id="llc-partnership">
                <li>
                  <h3>Limited liability company classified as a partnership</h3>
                  <div>
                    <h4>Return due date</h4>
                    <p>15th day of the 3rd month after the close of your tax year.</p>
                    <h4>Payment due date</h4>
                    <p>15th day of the 3rd month after the close of your tax year.</p>
                  </div>
                </li>
              </ol>
            </main>
          </div>
        </body>
      </html>
    `

    const text = extractOfficialSourceText(html)

    expect(text).toContain('Limited liability company classified as a partnership')
    expect(text).toContain('Return due date')
    expect(text).toContain('15th day of the 3rd month after the close of your tax year.')
  })
})
