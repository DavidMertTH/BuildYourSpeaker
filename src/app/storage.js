export function readJsonStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJsonStorage(key, value, errorMessage = "Could not save data.") {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(errorMessage, error);
    return false;
  }
}

export function readStringStorage(key, fallback = "") {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStringStorage(key, value) {
  localStorage.setItem(key, value);
}

export function removeStorageItem(key) {
  localStorage.removeItem(key);
}
