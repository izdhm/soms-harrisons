// Status identity colours. Order follows the order lifecycle and was checked for
// colour-blind separation between neighbours in the stacked status bar.
export const STATUS_ORDER = ['Open order', 'Delivered', 'Invoiced', 'Cancelled'] as const

const STATUS_TONE: Record<string, string> = {
  'open order': 'open',
  delivered: 'delivered',
  invoiced: 'invoiced',
  cancelled: 'cancelled',
}

/** CSS modifier for a status, "unknown" for anything the API adds later. */
export function statusTone(status: string): string {
  return STATUS_TONE[status.trim().toLowerCase()] ?? 'unknown'
}
