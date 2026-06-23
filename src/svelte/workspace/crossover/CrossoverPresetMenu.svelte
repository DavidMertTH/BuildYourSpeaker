<script>
  import CrossoverPresetButton from "./CrossoverPresetButton.svelte";

  export let disabled = false;

  const presets = [
    {
      preset: "lowpass-2",
      previewName: "Low-pass 2",
      label: "Insert 2nd order low-pass preset",
      viewBox: "0 0 52 30",
      paths: ["M2 10 C2 4 9 4 9 10 C9 16 16 16 16 10 C16 4 23 4 23 10 C23 16 30 16 32 10 H50", "M38 10 V18 M34 18 H42 M34 22 H42 M38 22 V28"],
    },
    {
      preset: "lowpass-3",
      previewName: "Low-pass 3",
      label: "Insert 3rd order low-pass preset",
      viewBox: "0 0 52 30",
      paths: ["M2 10 C2 4 8 4 8 10 C8 16 14 16 14 10 C14 4 20 4 20 10 H31 C31 4 37 4 37 10 C37 16 43 16 43 10 H50", "M26 10 V18 M22 18 H30 M22 22 H30 M26 22 V28"],
    },
    {
      preset: "highpass-2",
      previewName: "High-pass 2",
      label: "Insert 2nd order high-pass preset",
      viewBox: "0 0 52 30",
      paths: ["M2 10 H13 M13 3 V17 M21 3 V17 M21 10 H50", "M38 10 V15 C38 10 45 10 45 15 C45 20 38 20 38 15 V28"],
    },
    {
      preset: "highpass-3",
      previewName: "High-pass 3",
      label: "Insert 3rd order high-pass preset",
      viewBox: "0 0 52 30",
      paths: ["M2 10 H10 M10 3 V17 M18 3 V17 M18 10 H30 M30 3 V17 M38 3 V17 M38 10 H50", "M25 10 V15 C25 10 32 10 32 15 C32 20 25 20 25 15 V28"],
    },
    {
      preset: "lowpass-1",
      previewName: "Low-pass 1",
      label: "Insert 1st order low-pass preset",
      viewBox: "0 0 52 24",
      paths: ["M2 12 C2 4 10 4 10 12 C10 20 18 20 18 12 C18 4 26 4 26 12 C26 20 34 20 38 12 H50"],
    },
    {
      preset: "highpass-1",
      previewName: "High-pass 1",
      label: "Insert 1st order high-pass preset",
      viewBox: "0 0 52 24",
      paths: ["M2 12 H19 M19 4 V20 M29 4 V20 M29 12 H50"],
    },
    {
      preset: "lpad",
      previewName: "L-pad",
      label: "Insert L-pad attenuator preset",
      viewBox: "0 0 52 30",
      paths: ["M2 10 H9 L12 4 L18 16 L24 4 L30 16 L33 10 H50", "M39 10 V16 L34 19 L44 24 L34 28 H44"],
    },
    {
      preset: "zobel",
      previewName: "Zobel",
      label: "Insert Zobel compensation preset",
      viewBox: "0 0 52 30",
      paths: ["M2 9 H50", "M39 9 V15 H30 L27 11 L22 19 L17 11 L14 15 H8", "M8 15 V23 H22 M22 18 V28 M30 18 V28 M30 23 H44 V9"],
    },
    {
      preset: "notch",
      previewName: "Notch",
      label: "Insert notch trap preset",
      viewBox: "0 0 52 30",
      paths: ["M2 8 H50", "M42 8 V14 H34 L31 10 L26 18 L21 10 L18 14 H12 M12 14 H20 M20 10 V18 M27 10 V18 M27 14 C27 8 35 8 35 14 C35 20 27 20 27 14 H42 V28"],
    },
    {
      preset: "baffle-step",
      previewName: "Baffle step",
      label: "Insert baffle-step compensation preset",
      viewBox: "0 0 52 30",
      paths: ["M2 9 C2 3 9 3 9 9 C9 15 16 15 16 9 C16 3 23 3 23 9 H50", "M2 22 H9 L12 16 L18 28 L24 16 L30 28 L33 22 H50"],
    },
  ];
</script>

<details class="crossover-preset-menu">
  <summary aria-label="Open preset filters">Presets</summary>
  <div class="crossover-preset-list">
    {#each presets as preset (preset.preset)}
      <CrossoverPresetButton {...preset} {disabled} />
    {/each}
  </div>
</details>
