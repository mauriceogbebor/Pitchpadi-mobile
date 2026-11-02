// Copies the API's OpenAPI document into this repo and regenerates the typed client.
// Source: OPENAPI_SOURCE (file path or URL), default ../pitchpadi-api/openapi.json.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const source = process.env.OPENAPI_SOURCE ?? "../pitchpadi-api/openapi.json";
const text = /^https?:\/\//.test(source)
  ? await (await fetch(source)).text()
  : readFileSync(source, "utf8");
JSON.parse(text); // fail fast on a bad document
writeFileSync("src/api/openapi.json", text.endsWith("\n") ? text : `${text}\n`);
console.log(`Copied OpenAPI document from ${source}`);
execSync("npx orval --config orval.config.ts", { stdio: "inherit" });
console.log("Generated src/api/generated.ts");
