const MAX_PDF_TEXT_PAGES = 80
const MAX_PDF_TEXT_CHARS = 6000

type PdfJsGetDocument = (typeof import('pdfjs-dist/legacy/build/pdf.mjs'))['getDocument']

let pdfJsGetDocumentPromise: Promise<PdfJsGetDocument> | null = null

class MinimalPdfJsDOMMatrix {
  a = 1
  b = 0
  c = 0
  d = 1
  e = 0
  f = 0

  constructor(init?: unknown) {
    if (Array.isArray(init)) {
      this.setFromArray(init)
      return
    }

    if (ArrayBuffer.isView(init) && !(init instanceof DataView) && 'length' in init) {
      this.setFromArrayLike(init)
      return
    }

    if (!isRecord(init)) return

    this.a = readMatrixNumber(init.a, this.a)
    this.b = readMatrixNumber(init.b, this.b)
    this.c = readMatrixNumber(init.c, this.c)
    this.d = readMatrixNumber(init.d, this.d)
    this.e = readMatrixNumber(init.e, this.e)
    this.f = readMatrixNumber(init.f, this.f)
  }

  translate(): MinimalPdfJsDOMMatrix {
    return this
  }

  scale(): MinimalPdfJsDOMMatrix {
    return this
  }

  translateSelf(): MinimalPdfJsDOMMatrix {
    return this
  }

  scaleSelf(): MinimalPdfJsDOMMatrix {
    return this
  }

  multiplySelf(): MinimalPdfJsDOMMatrix {
    return this
  }

  preMultiplySelf(): MinimalPdfJsDOMMatrix {
    return this
  }

  invertSelf(): MinimalPdfJsDOMMatrix {
    return this
  }

  private setFromArray(values: readonly number[]): void {
    if (values.length < 6) return

    this.a = readMatrixNumber(values[0], this.a)
    this.b = readMatrixNumber(values[1], this.b)
    this.c = readMatrixNumber(values[2], this.c)
    this.d = readMatrixNumber(values[3], this.d)
    this.e = readMatrixNumber(values[4], this.e)
    this.f = readMatrixNumber(values[5], this.f)
  }

  private setFromArrayLike(values: ArrayBufferView & { length: unknown }): void {
    if (typeof values.length !== 'number' || values.length < 6) return

    this.a = readMatrixNumber(Reflect.get(values, '0'), this.a)
    this.b = readMatrixNumber(Reflect.get(values, '1'), this.b)
    this.c = readMatrixNumber(Reflect.get(values, '2'), this.c)
    this.d = readMatrixNumber(Reflect.get(values, '3'), this.d)
    this.e = readMatrixNumber(Reflect.get(values, '4'), this.e)
    this.f = readMatrixNumber(Reflect.get(values, '5'), this.f)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readMatrixNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function ensurePdfJsDOMMatrix(): void {
  if (typeof Reflect.get(globalThis, 'DOMMatrix') === 'function') return
  Reflect.set(globalThis, 'DOMMatrix', MinimalPdfJsDOMMatrix)
}

function loadPdfJsGetDocument(): Promise<PdfJsGetDocument> {
  ensurePdfJsDOMMatrix()
  pdfJsGetDocumentPromise ??= import('pdfjs-dist/legacy/build/pdf.mjs').then(
    ({ getDocument }) => getDocument,
  )
  return pdfJsGetDocumentPromise
}

export async function extractPdfText(buffer: ArrayBuffer): Promise<string | null> {
  const getPdfDocument = await loadPdfJsGetDocument()
  const loadingTask = getPdfDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  })
  const pdf = await loadingTask.promise

  try {
    const pageTexts = await Promise.all(
      Array.from({ length: Math.min(pdf.numPages, MAX_PDF_TEXT_PAGES) }, async (_, index) => {
        const page = await pdf.getPage(index + 1)
        const content = await page.getTextContent()
        return content.items
          .map((item) => {
            if (typeof item !== 'object' || item === null || !('str' in item)) return ''
            const text = item.str
            return typeof text === 'string' ? text : ''
          })
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
      }),
    )

    const text = pageTexts.filter(Boolean).join('\n').slice(0, MAX_PDF_TEXT_CHARS).trim()
    return text.length > 0 ? text : null
  } finally {
    await pdf.destroy()
  }
}
