// The shape of the frozen document texts in this folder (as src/lib/documents/types.ts had it on
// 2026-11-28). Frozen with them: the migration must read the same data wherever it runs.

export type DocumentBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string; indent?: boolean; strongLead?: boolean; note?: boolean }
  | { type: 'list'; items: string[] }
  | { type: 'table'; caption?: string; head: string[]; rows: string[][] }
  | { type: 'signatories'; people: { name: string; role: string; organisation: string }[] }
