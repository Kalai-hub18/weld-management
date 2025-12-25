export function mergeSettings(base, override) {
  return {
    currency: { ...(base?.currency || {}), ...(override?.currency || {}) },
    dateTime: { ...(base?.dateTime || {}), ...(override?.dateTime || {}) },
    theme: { ...(base?.theme || {}), ...(override?.theme || {}) },
  }
}


