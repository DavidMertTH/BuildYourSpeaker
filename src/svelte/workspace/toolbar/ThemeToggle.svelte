<script>
  import { onMount } from "svelte";

  const themeChoices = [
    {
      choice: "dark",
      label: "Dark theme",
      hiddenLabel: "Dark",
      icon: "moon",
    },
    {
      choice: "light",
      label: "Light theme",
      hiddenLabel: "Light",
      icon: "sun",
    },
    {
      choice: "sync",
      label: "Sync with system theme",
      hiddenLabel: "Sync",
      icon: "screen",
    },
  ];

  let activeChoice = "sync";

  function chooseTheme(choice) {
    activeChoice = choice;
    window.dispatchEvent(new CustomEvent("cabio:theme-choice-change", { detail: { choice } }));
  }

  onMount(() => {
    const syncThemeChoice = (event) => {
      if (event.detail?.choice) activeChoice = event.detail.choice;
    };
    window.addEventListener("cabio:theme-choice-sync", syncThemeChoice);
    return () => window.removeEventListener("cabio:theme-choice-sync", syncThemeChoice);
  });
</script>

<div class="toolbar-group theme-toolbar" aria-label="Theme">
  <div class="segmented theme-toggle">
    <span class="pill-indicator" aria-hidden="true"></span>
    {#each themeChoices as theme (theme.choice)}
      <button
        class:active={activeChoice === theme.choice}
        class="theme-button"
        data-theme-choice={theme.choice}
        type="button"
        aria-label={theme.label}
        onclick={() => chooseTheme(theme.choice)}
      >
        <svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
          {#if theme.icon === "moon"}
            <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"></path>
          {:else if theme.icon === "sun"}
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>
          {:else}
            <rect x="3" y="4" width="18" height="12" rx="2"></rect>
            <path d="M8 20h8M12 16v4"></path>
          {/if}
        </svg>
        <span class="visually-hidden">{theme.hiddenLabel}</span>
      </button>
    {/each}
  </div>
</div>
