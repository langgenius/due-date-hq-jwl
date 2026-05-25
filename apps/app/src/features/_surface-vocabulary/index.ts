/**
 * Shared design vocabulary for the table-bearing surfaces.
 *
 * See `docs/Design/unified-table-surface-vocabulary.md`.
 *
 * These primitives are the canonical implementation of patterns that
 * Obligations queue, Rule library, and Clients list should all reach
 * for. Import from here — don't duplicate the visual shape per surface.
 */
export {
  SurfaceSummaryStrip,
  type SurfaceSummaryItem,
  type SurfaceSummaryItemTone,
  type SurfaceSummaryStripProps,
} from './SurfaceSummaryStrip'
