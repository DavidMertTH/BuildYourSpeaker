import { cloneProject } from "../state.js";
import { PROJECT_STORAGE_KEY, PROJECT_SYNC_CHANNEL, THEME_STORAGE_KEY, UNIT_PREF_STORAGE_KEY } from "./constants.js";

let projectSyncChannel = null;

export function isGoldenLayoutPopoutWindow(location = globalThis.location) {
  return new URLSearchParams(location.search).has("gl-window");
}

export function initializePopoutProjectSync({ applyProject, applyTheme, applyUnits }) {
  window.addEventListener("storage", (event) => {
    if (event.key === PROJECT_STORAGE_KEY && event.newValue) {
      try {
        applyProject(JSON.parse(event.newValue));
      } catch (error) {
        console.warn("Could not sync project state into popout.", error);
      }
      return;
    }

    if (event.key === THEME_STORAGE_KEY) {
      applyTheme?.();
      return;
    }

    if (event.key === UNIT_PREF_STORAGE_KEY) {
      applyUnits?.();
    }
  });

  const channel = getProjectSyncChannel();
  if (channel) {
    channel.addEventListener("message", (event) => {
      if (event.data?.type !== "project" || !event.data.project) return;
      applyProject(event.data.project);
    });
  }
}

export function broadcastProjectState(project) {
  if (isGoldenLayoutPopoutWindow()) return;
  getProjectSyncChannel()?.postMessage({ type: "project", project: cloneProject(project) });
}

function getProjectSyncChannel() {
  if (!("BroadcastChannel" in window)) return null;
  if (!projectSyncChannel) projectSyncChannel = new BroadcastChannel(PROJECT_SYNC_CHANNEL);
  return projectSyncChannel;
}
