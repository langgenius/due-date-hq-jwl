// 2026-06-05 (pre-CI green-up): pdfjs-dist@5 ships no .d.ts for
// `pdfjs-dist/legacy/build/pdf.worker.mjs`. `@duedatehq/ingest` has a
// sibling .d.ts that satisfies its own tsc, but the apps/server
// project compiles it from its own perspective and doesn't see that
// sibling because the import resolves via node_modules symlink.
// Mirror the declaration here so server tsc resolves the dynamic
// import to the same narrow shape (`{ WorkerMessageHandler: unknown }`).
declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs' {
  export const WorkerMessageHandler: unknown
}
