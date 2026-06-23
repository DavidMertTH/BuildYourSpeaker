import "./vendor/golden-layout/golden-layout.min.js";
import { mount } from "svelte";
import CabioApp from "./svelte/CabioApp.svelte";

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
