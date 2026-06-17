import { createApplication, loadApplicationConfig } from "./application.js";

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
