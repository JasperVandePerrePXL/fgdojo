// localStorage wrappers that never throw (storage can be blocked, e.g. in private browsing).

/** @returns {string|null} The stored value, or null when missing or storage is unavailable. */
export function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Stores a value; silently does nothing when storage is unavailable. */
export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore: remembering the selection is a convenience, not a requirement.
  }
}
