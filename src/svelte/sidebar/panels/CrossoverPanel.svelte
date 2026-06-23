<script>
  import CrossoverControls from "../crossover/CrossoverControls.svelte";
  import LegalFooter from "../footer/LegalFooter.svelte";

  export let active = false;
</script>

<CrossoverControls {active} />
<LegalFooter />
