// 2026-06-05 (pre-CI green-up): pdfjs-dist@5 doesn't ship .d.ts for
// the legacy worker subpath. The runtime call site only needs
// `WorkerMessageHandler`, so declare a narrow shape rather than `any`.
declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs' {
  export const WorkerMessageHandler: unknown
}
