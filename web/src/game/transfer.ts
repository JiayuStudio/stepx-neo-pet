import { normalizeSnapshot } from './save'
import type { GameSnapshot } from './types'

export const SAVE_TRANSFER_APP = 'tamagochi'
export const SAVE_TRANSFER_FORMAT = 1
export const SAVE_SCHEMA_VERSION = 3
const MAX_TRANSFER_LENGTH = 200_000

export interface SaveTransferFile {
  app: typeof SAVE_TRANSFER_APP
  format: typeof SAVE_TRANSFER_FORMAT
  saveVersion: typeof SAVE_SCHEMA_VERSION
  exportedAt: string
  snapshot: GameSnapshot
}

export type SaveParseResult =
  | { ok: true; snapshot: GameSnapshot }
  | { ok: false; error: string }

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

/** Builds the portable save file wrapper around a normalized snapshot. */
export const createSaveTransferFile = (snapshot: GameSnapshot, now = Date.now()): SaveTransferFile => ({
  app: SAVE_TRANSFER_APP,
  format: SAVE_TRANSFER_FORMAT,
  saveVersion: SAVE_SCHEMA_VERSION,
  exportedAt: new Date(now).toISOString(),
  snapshot,
})

export const serializeSave = (snapshot: GameSnapshot, now = Date.now()) => (
  JSON.stringify(createSaveTransferFile(snapshot, now), null, 2)
)

export const saveFileName = (petName: string, now = Date.now()) => {
  const safeName = petName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mori'
  return `tamagochi-${safeName}-${new Date(now).toISOString().slice(0, 10)}.json`
}

/**
 * Reads exported save text. Backup files are treated as untrusted input: the
 * payload is only accepted when it is recognizable, and every field is then
 * normalized by the same rules used for browser storage.
 */
export const parseSaveTransfer = (text: string, now = Date.now()): SaveParseResult => {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, error: 'Paste or choose an exported Tamagochi save first.' }
  if (trimmed.length > MAX_TRANSFER_LENGTH) return { ok: false, error: 'That file is too large to be a Tamagochi save.' }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return { ok: false, error: 'That does not look like save data. Expected a Tamagochi JSON file.' }
  }

  if (!isRecord(parsed)) return { ok: false, error: 'That save file is not in a readable format.' }

  const wrapped = isRecord(parsed.snapshot) ? parsed.snapshot : null
  if (wrapped && parsed.app !== undefined && parsed.app !== SAVE_TRANSFER_APP) {
    return { ok: false, error: 'That backup belongs to a different app.' }
  }

  const candidate = wrapped ?? parsed
  const looksLikeSave = 'needs' in candidate || 'petName' in candidate || 'growthPoints' in candidate
  if (!looksLikeSave) return { ok: false, error: 'No Tamagochi save data was found in that file.' }

  return { ok: true, snapshot: normalizeSnapshot(candidate, now) }
}
