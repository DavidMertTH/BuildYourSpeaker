<script>
  import { onMount } from "svelte";

  let canUndo = false;
  let canRedo = false;

  function dispatchHistoryAction(action) {
    window.dispatchEvent(new CustomEvent("cabio:history-action", { detail: { action } }));
  }

  onMount(() => {
    const syncHistoryState = (event) => {
      canUndo = event.detail?.canUndo === true;
      canRedo = event.detail?.canRedo === true;
    };
    window.addEventListener("cabio:history-state", syncHistoryState);
    window.dispatchEvent(new CustomEvent("cabio:history-request"));
    return () => window.removeEventListener("cabio:history-state", syncHistoryState);
  });
</script>

<div class="toolbar-group history-toolbar" aria-label="Edit history">
  <button
    id="undoButton"
    class="history-button"
    type="button"
    aria-label="Undo"
    aria-keyshortcuts="Control+Z Meta+Z"
    title="Undo the last project change (Ctrl/Cmd+Z)."
    disabled={!canUndo}
    onclick={() => dispatchHistoryAction("undo")}
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 7 4 12l5 5" />
      <path d="M5 12h8a6 6 0 0 1 6 6" />
    </svg>
  </button>
  <button
    id="redoButton"
    class="history-button"
    type="button"
    aria-label="Redo"
    aria-keyshortcuts="Control+Y Meta+Shift+Z"
    title="Redo the last undone project change (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y)."
    disabled={!canRedo}
    onclick={() => dispatchHistoryAction("redo")}
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m15 7 5 5-5 5" />
      <path d="M19 12h-8a6 6 0 0 0-6 6" />
    </svg>
  </button>
</div>
