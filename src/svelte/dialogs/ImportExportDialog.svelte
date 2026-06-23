<script>
  import { onMount } from "svelte";
  import StatusText from "../common/StatusText.svelte";

  let downloadLink;
  let downloadUrl = "";

  function dispatchProjectAction(action) {
    window.dispatchEvent(new CustomEvent("cabio:project-action", { detail: { action } }));
  }

  function handleProjectFileChange(event) {
    const file = event.currentTarget.files?.[0];
    if (file) {
      window.dispatchEvent(new CustomEvent("cabio:project-action", {
        detail: { action: "import-project-file", file },
      }));
    }
    event.currentTarget.value = "";
  }

  function handleProjectDownload(event) {
    if (!downloadLink) return;
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    const text = event.detail?.text || "";
    const filename = event.detail?.filename || "audiosim-project.json";
    const blob = new Blob([text], { type: "application/json" });
    downloadUrl = URL.createObjectURL(blob);
    downloadLink.href = downloadUrl;
    downloadLink.download = filename;
    downloadLink.click();
    queueMicrotask(() => {
      if (!downloadUrl) return;
      URL.revokeObjectURL(downloadUrl);
      downloadUrl = "";
    });
  }

  onMount(() => {
    window.addEventListener("cabio:project-download", handleProjectDownload);
    return () => {
      window.removeEventListener("cabio:project-download", handleProjectDownload);
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  });
</script>

<dialog id="importExportDialog" class="project-dialog" aria-label="Import and export">
  <form method="dialog" class="project-dialog-shell">
    <div class="project-dialog-header">
      <button id="closeImportExportDialog" type="button" aria-label="Close import export dialog" onclick={() => dispatchProjectAction("close-import-export")}>Close</button>
    </div>
    <textarea id="projectJson" spellcheck="false" aria-label="Project JSON"></textarea>
    <StatusText id="projectDialogStatus" className="search-status" />
    <div class="project-dialog-actions">
      <label class="file-button">
        Import file
        <input id="importInput" type="file" accept="application/json" onchange={handleProjectFileChange} />
      </label>
      <button id="importJsonButton" type="button" onclick={() => dispatchProjectAction("apply-project-json")}>Apply JSON</button>
      <button id="exportButton" type="button" onclick={() => dispatchProjectAction("export-project")}>Export</button>
    </div>
    <a bind:this={downloadLink} href={downloadUrl || "about:blank"} hidden aria-hidden="true" tabindex="-1">Download project</a>
  </form>
</dialog>
