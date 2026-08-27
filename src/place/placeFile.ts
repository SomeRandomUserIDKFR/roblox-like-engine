import type { PlaceSnapshot } from "./PlaceSnapshot";

const EXT = ".polyx.json";

/** Download place as a portable JSON file. */
export function downloadPlace(snap: PlaceSnapshot, filename = "place") {
  const name = filename.endsWith(EXT) ? filename : `${filename}${EXT}`;
  const blob = new Blob([JSON.stringify(snap, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Open a file picker and parse a place snapshot. */
export function openPlaceFile(): Promise<PlaceSnapshot | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.polyx.json,application/json";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result)) as PlaceSnapshot;
          if (!data || data.version !== 1 || !Array.isArray(data.root)) {
            throw new Error("Invalid place file");
          }
          resolve(data);
        } catch (err) {
          console.error(err);
          alert(`Could not load place: ${err}`);
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    });
    input.click();
  });
}

const AUTOSAVE_KEY = "polyx-studio-autosave";

export function autosavePlace(snap: PlaceSnapshot) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snap));
  } catch {
    /* quota */
  }
}

export function loadAutosave(): PlaceSnapshot | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlaceSnapshot;
  } catch {
    return null;
  }
}

export function clearAutosave() {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    /* ignore */
  }
}
