import { cloneProject } from "../state.js";

const DEFAULT_HISTORY_LIMIT = 100;

export function createProjectHistory(initialProject, options = {}) {
  const limit = Math.max(2, Math.round(Number(options.limit) || DEFAULT_HISTORY_LIMIT));
  let entries = [cloneProject(initialProject)];
  let index = 0;
  let replacingCurrentChange = false;

  return {
    canUndo: () => index > 0,
    canRedo: () => index < entries.length - 1,
    record(project, recordOptions = {}) {
      const snapshot = cloneProject(project);
      const replace = recordOptions.replace === true;

      if (replace && replacingCurrentChange) {
        entries[index] = snapshot;
      } else {
        entries = entries.slice(0, index + 1);
        entries.push(snapshot);
        index = entries.length - 1;
        if (entries.length > limit) {
          entries.splice(0, entries.length - limit);
          index = entries.length - 1;
        }
      }

      replacingCurrentChange = replace;
    },
    undo() {
      if (index <= 0) return null;
      index -= 1;
      replacingCurrentChange = false;
      return cloneProject(entries[index]);
    },
    redo() {
      if (index >= entries.length - 1) return null;
      index += 1;
      replacingCurrentChange = false;
      return cloneProject(entries[index]);
    },
  };
}

export function historyActionFromKeyboardEvent(event) {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return "";
  const key = String(event.key || "").toLowerCase();
  if (key === "z") return event.shiftKey ? "redo" : "undo";
  if (key === "y" && !event.shiftKey) return "redo";
  return "";
}
