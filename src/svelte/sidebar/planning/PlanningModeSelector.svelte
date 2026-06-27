<script>
  import { onMount } from "svelte";

  const modes = [
    { mode: "sealed", label: "Sealed" },
    { mode: "vented", label: "Vented" },
    { mode: "passive", label: "P-Radiator" },
    { mode: "bandpass", label: "Bandpass" },
  ];

  let activeMode = "sealed";

  function chooseMode(mode) {
    activeMode = mode;
    window.dispatchEvent(new CustomEvent("cabio:box-mode-change", { detail: { mode } }));
  }

  onMount(() => {
    const syncMode = (event) => {
      if (event.detail?.mode) activeMode = event.detail.mode;
    };
    window.addEventListener("cabio:box-mode-sync", syncMode);
    return () => window.removeEventListener("cabio:box-mode-sync", syncMode);
  });
</script>

<div class="segmented mode-segmented">
  <span class="pill-indicator" aria-hidden="true"></span>
  {#each modes as item (item.mode)}
    <button
      class:active={activeMode === item.mode}
      class="mode-button"
      data-mode={item.mode}
      type="button"
      onclick={() => chooseMode(item.mode)}
    >
      {item.label}
    </button>
  {/each}
</div>
