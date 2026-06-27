import * as goldenLayoutModule from "./vendor/golden-layout/golden-layout.min.js";
import { mount } from "svelte";
import CabioApp from "./svelte/CabioApp.svelte";

const goldenLayoutNamespace = globalThis.goldenLayout || goldenLayoutModule.default || goldenLayoutModule;
if (!globalThis.goldenLayout && goldenLayoutNamespace?.GoldenLayout) {
  globalThis.goldenLayout = goldenLayoutNamespace;
}

mount(CabioApp, {
  target: document.querySelector("#app"),
});

const { createApplication, loadApplicationConfig } = await import("./application.js");
const config = loadApplicationConfig();
const app = createApplication(config);

try {
  app.initialize();
  app.registerEvents();
  app.start();
} catch (error) {
  console.error("App startup failed.", error);
  throw error;
}
