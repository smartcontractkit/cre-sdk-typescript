import { Hono } from "hono";
import { sleep } from "./utils/sleep";

const app = new Hono().basePath("/api/v1");

app.get("/example1", async (c) => {
  console.log("[/example1] Request received");
  await sleep(10_000);
  console.log("[/example1] Returning result");
  return c.text("example1 completed");
});

app.get("/example2", async (c) => {
  console.log("[/example2] Request received");
  await sleep(3_000);
  console.log("[/example2] Returning result");
  return c.text("example2 completed");
});

app.get("/example3", async (c) => {
  console.log("[/example3] Request received");
  await sleep(1_000);
  console.log("[/example3] Returning result");
  return c.text("example3 completed");
});

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;

console.log(`Starting test server on port ${port}...`);

export default {
  port,
  fetch: app.fetch,
};
