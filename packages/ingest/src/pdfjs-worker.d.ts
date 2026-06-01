// pdfjs-dist ships no .d.ts for its worker entry, but pdf.ts imports it to
// register the main-thread "fake worker" handler (see ensurePdfJsWorker).
declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs' {
  export const WorkerMessageHandler: unknown
}
