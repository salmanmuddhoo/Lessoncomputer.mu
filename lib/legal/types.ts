export type LegalRun = { text: string; b?: boolean; href?: string }

export type LegalBlock =
  | { t: 'h2'; text: string }
  | { t: 'p'; runs: LegalRun[] }
  | { t: 'ul' | 'ol'; items: LegalRun[][] }
  | { t: 'table'; rows: string[][] }

export type LegalDoc = {
  title: string
  updated: string
  blocks: LegalBlock[]
}
