<script>
  function dispatchProjectAction(action, event) {
    event.currentTarget.closest("details")?.removeAttribute("open");
    window.dispatchEvent(new CustomEvent("cabio:project-action", { detail: { action } }));
  }
</script>

<details class="toolbar-group panel-menu file-menu" aria-label="File actions">
  <summary><span class="panel-menu-summary-label">File</span></summary>
  <div class="panel-menu-list file-menu-list">
    <button id="fileSaveButton" type="button" onclick={(event) => dispatchProjectAction("export-project", event)}>Save</button>
    <button id="fileOpenButton" type="button" onclick={(event) => dispatchProjectAction("open-import-export", event)}>Open</button>
    <button id="filePdfExportButton" type="button" disabled title="PDF export will be designed next.">Export as PDF</button>
  </div>
</details>
