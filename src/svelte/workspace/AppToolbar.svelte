<script>
  import FileMenu from "./toolbar/FileMenu.svelte";
  import GraphMenu from "./toolbar/GraphMenu.svelte";
  import HistoryControls from "./toolbar/HistoryControls.svelte";
  import ThemeToggle from "./toolbar/ThemeToggle.svelte";
</script>

<header class="app-toolbar">
  <FileMenu />
  <HistoryControls />
  <GraphMenu />
  <ThemeToggle />
</header>
