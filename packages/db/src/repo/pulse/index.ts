// Public surface of the Pulse repo, preserved exactly as the former single
// pulse.ts file exposed it. Explicit named re-exports (not `export *`) keep the
// oxc no-barrel-file rule happy and make the surface auditable.
export { makePulseRepo, type PulseRepo } from './scoped'
export { makePulseOpsRepo, type PulseOpsRepo } from './ops'
export {
  PulseRepoError,
  scorePulsePriority,
  computePulseDedupeKey,
  pulseChangeKindFamily,
} from './shared'
