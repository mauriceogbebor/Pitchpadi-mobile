import { defineConfig } from "orval";

// Generates a typed client from the API's OpenAPI document (the contract), as the
// web app does. Run `npm run api:sync` after the API changes.
export default defineConfig({
  app: {
    input: "./src/api/openapi.json",
    output: {
      target: "./src/api/generated.ts",
      client: "fetch",
      mode: "single",
      baseUrl: "",
      override: {
        mutator: { path: "./src/api/fetch.ts", name: "appFetch" },
      },
    },
  },
});
