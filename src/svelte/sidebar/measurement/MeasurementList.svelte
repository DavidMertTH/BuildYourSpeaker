<script>
  import { onMount } from "svelte";
  import IconEye from "../../workspace/IconEye.svelte";
  import IconTrash from "../../workspace/IconTrash.svelte";

  let staged = null;
  let responses = [];
  let candidates = [];
  let targetOptions = [];
  let editingResponseId = "";

  function syncMeasurementList(event) {
    staged = event.detail?.staged || null;
    responses = event.detail?.responses || [];
    candidates = event.detail?.candidates || [];
    targetOptions = event.detail?.targetOptions || [];
  }

  function requestSync() {
    window.dispatchEvent(new CustomEvent("cabio:measurement-list-request"));
  }

  function dispatchAction(action, detail = {}) {
    window.dispatchEvent(new CustomEvent("cabio:measurement-view-action", {
      detail: { action, ...detail },
    }));
  }

  function beginRename(response) {
    editingResponseId = response.id;
    queueMicrotask(() => {
      const input = document.querySelector(`.measurement-name-inline[data-response-id="${CSS.escape(response.id)}"]`);
      input?.focus();
      input?.select();
    });
  }

  function finishRename(response, event) {
    const nextName = event.currentTarget.value.trim();
    editingResponseId = "";
    if (nextName && nextName !== response.name) {
      dispatchAction("rename-response", { responseId: response.id, value: nextName });
    }
  }

  function handleRenameKeydown(response, event) {
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key === "Escape") {
      event.currentTarget.value = response.name || response.shortName;
      editingResponseId = "";
    }
  }

  function setResponseAngle(response, event) {
    dispatchAction("set-response-angle", {
      responseId: response.id,
      value: event.currentTarget.value,
    });
  }

  function openCandidate(candidate) {
    if (candidate.url) window.open(candidate.url, "_blank", "noopener");
  }

  onMount(() => {
    window.addEventListener("cabio:measurement-list-sync", syncMeasurementList);
    queueMicrotask(requestSync);
    const fallback = window.setTimeout(requestSync, 0);
    return () => {
      window.clearTimeout(fallback);
      window.removeEventListener("cabio:measurement-list-sync", syncMeasurementList);
    };
  });
</script>

<div id="measurementList" class="search-results">
  {#if !staged && !responses.length && !candidates.length}
    <div class="crossover-empty" data-measurement-empty="true">No frequency responses loaded.</div>
  {/if}

  {#if staged}
    <section class="measurement-group-block measurement-staged-section" data-measurement-section="staged-recording">
      <div class="measurement-group-header">
        <span class="measurement-group-title">Staged recording</span>
        <div class="measurement-staged-actions">
          <button type="button" data-staged-recording-action="save" title="Save this staged recording into Measurement." onclick={() => dispatchAction("save-staged")}>Save</button>
          <button type="button" class="danger" data-staged-recording-action="discard" title="Discard this staged recording." onclick={() => dispatchAction("discard-staged")}>Discard</button>
        </div>
      </div>
      <div class="measurement-staged-body" data-measurement-part="staged-body">
        <div class="measurement-staged-summary" title={staged.fullName}>
          <strong>{staged.name}</strong>
          <span>{staged.meta}</span>
        </div>
      </div>
    </section>
  {/if}

  {#if responses.length}
    <section class="measurement-group-block" data-measurement-section="responses" data-measurement-key="responses">
      <div class="measurement-group-header">
        <span class="measurement-group-title">Responses</span>
      </div>
      <div class="measurement-group-chips" data-measurement-group-id="" data-empty-label="No responses">
        {#each responses as response (response.id)}
          <article class="measurement-chip" draggable="true" data-measurement-id={response.measurementId} title={response.fullName}>
            <span
              class="measurement-chip-name"
              data-measurement-part="name"
              data-response-id={response.id}
              title={response.fullName}
              role="button"
              tabindex="0"
              hidden={editingResponseId === response.id}
              ondblclick={() => beginRename(response)}
              onkeydown={(event) => {
                if (event.key === "Enter" || event.key === "F2") beginRename(response);
              }}
            >{response.shortName}</span>
            <input
              type="text"
              class="measurement-name-inline"
              data-measurement-part="name-input"
              data-response-id={response.id}
              value={response.name || response.shortName}
              hidden={editingResponseId !== response.id}
              onblur={(event) => finishRename(response, event)}
              onkeydown={(event) => handleRenameKeydown(response, event)}
            />
            <span class="measurement-chip-meta" data-measurement-part="meta">{response.meta}</span>
            <select
              class="measurement-target-inline"
              data-measurement-part="target"
              title="Assign this measurement to a config or config group."
              onchange={(event) => dispatchAction("set-response-target", { responseId: response.id, value: event.currentTarget.value })}
            >
              {#each targetOptions as option}
                <option value={option.value} selected={option.value === response.target}>{option.label}</option>
              {/each}
            </select>
            <input
              type="number"
              min="-180"
              max="180"
              step="1"
              class="measurement-angle-inline"
              data-measurement-part="angle"
              value={response.angle}
              onchange={(event) => setResponseAngle(response, event)}
            />
            <div class="measurement-chip-actions">
              <button
                type="button"
                class:active={response.visible}
                data-measurement-action="visibility"
                data-response-id={response.id}
                data-response-visible={String(response.visible)}
                aria-pressed={String(response.visible)}
                aria-label={`${response.visible ? "Hide" : "Show"} ${response.shortName}`}
                title={response.visible ? "Hide this measurement." : "Show this measurement."}
                onclick={() => dispatchAction("toggle-response-visibility", { responseId: response.id, visible: !response.visible })}
              >
                <IconEye visible={response.visible} />
              </button>
              <button
                type="button"
                class="danger"
                data-measurement-action="remove"
                data-response-id={response.id}
                aria-label={`Remove ${response.shortName}`}
                title="Delete this measurement."
                onclick={() => dispatchAction("remove-response", { responseId: response.id })}
              >
                <IconTrash />
              </button>
            </div>
          </article>
        {/each}
      </div>
    </section>
  {/if}

  {#if candidates.length}
    <section class="measurement-candidate-section" data-measurement-section="candidates" data-measurement-key="candidates">
      <div class="measurement-group-header">
        <span class="measurement-group-title">Candidates</span>
      </div>
      <div class="measurement-candidate-list" data-measurement-part="candidate-list">
        {#each candidates as candidate (candidate.id)}
          <article class="search-result frequency-response-result" data-measurement-id={candidate.measurementId}>
            <div class="search-result-title">
              <span data-measurement-part="name">{candidate.name}</span>
              <div class="crossover-transition-actions">
                <button type="button" data-measurement-action="open" disabled={!candidate.url} onclick={() => openCandidate(candidate)}>Open</button>
                <button type="button" class="danger" data-measurement-action="remove" onclick={() => dispatchAction("remove-candidate", { candidateId: candidate.id })}>Remove</button>
              </div>
            </div>
            <div class="search-result-meta" data-measurement-part="meta">{candidate.meta}</div>
            <div class="search-result-values">
              <div class="search-result-value"><span>Status</span><strong data-measurement-value="status">{candidate.status}</strong></div>
              <div class="search-result-value"><span>Format</span><strong data-measurement-value="format">{candidate.format}</strong></div>
              <div class="search-result-value"><span>Graph</span><strong data-measurement-value="graph">{candidate.graph}</strong></div>
            </div>
            <div class="search-result-fields" data-measurement-part="reason">{candidate.reason}</div>
          </article>
        {/each}
      </div>
    </section>
  {/if}
</div>
