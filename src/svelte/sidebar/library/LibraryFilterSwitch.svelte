<script>
  import { onMount } from "svelte";

  export let id;
  export let kind;
  export let label;

  let enabled = false;

  function toggle(event) {
    event.preventDefault();
    event.stopPropagation();
    window.dispatchEvent(new CustomEvent("cabio:library-action", { detail: { action: `toggle-${kind}-filters` } }));
  }

  function handleKeydown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    toggle(event);
  }

  onMount(() => {
    const sync = (event) => {
      if (event.detail?.kind !== kind) return;
      enabled = Boolean(event.detail.enabled);
    };
    window.addEventListener("cabio:library-filter-sync", sync);
    return () => window.removeEventListener("cabio:library-filter-sync", sync);
  });
</script>

<span
  {id}
  class="library-filter-toggle"
  role="switch"
  tabindex="0"
  aria-checked={enabled ? "true" : "false"}
  aria-label={label}
  onclick={toggle}
  onkeydown={handleKeydown}
></span>
