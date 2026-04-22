import { getEntityId, readJsonStorage, writeJsonStorage } from '../utils/helpers'

const STORAGE_KEY = 'arthika-known-funds'

function readRegistry() {
  return readJsonStorage(STORAGE_KEY, {})
}

function writeRegistry(registry) {
  writeJsonStorage(STORAGE_KEY, registry)
}

export function getKnownFunds(groupId) {
  const registry = readRegistry()
  return registry[groupId] ?? []
}

export function rememberFund(groupId, fund) {
  const registry = readRegistry()
  const existing = registry[groupId] ?? []
  const entry = {
    id: getEntityId(fund),
    name: fund.name ?? 'Saved fund',
  }

  registry[groupId] = [
    entry,
    ...existing.filter((item) => item.id !== entry.id),
  ].slice(0, 12)

  writeRegistry(registry)
}

export function forgetFund(groupId, fundId) {
  const registry = readRegistry()
  registry[groupId] = (registry[groupId] ?? []).filter((item) => item.id !== fundId)
  writeRegistry(registry)
}
