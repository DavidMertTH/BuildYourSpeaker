<script>
  import { onMount } from "svelte";

  export let id;
  export let tag = "div";
  export let className = "";
  export let initialText = "";
  export let ariaLive = "";

  let text = initialText;

  function syncText(event) {
    if (event.detail?.id !== id) return;
    text = event.detail?.text || "";
  }

  onMount(() => {
    text = window.__cabioTextSync?.[id] ?? text;
    window.addEventListener("cabio:text-sync", syncText);
    return () => window.removeEventListener("cabio:text-sync", syncText);
  });
</script>

{#if ariaLive}
  <svelte:element this={tag} {id} class={className} aria-live={ariaLive}>{text}</svelte:element>
{:else}
  <svelte:element this={tag} {id} class={className}>{text}</svelte:element>
{/if}
