import { Hono } from "hono";
import { sleep } from "../utils/sleep";

/**
 * Example endpoints with varying response delays.
 * Useful for testing parallel workflow execution — each endpoint takes
 * a different amount of time to respond, making it easy to verify that
 * a workflow fires requests concurrently rather than sequentially.
 */

const examples = new Hono();

examples.get("/example1", async (c) => {
	console.log("[/example1] Request received");
	await sleep(10_000);
	console.log("[/example1] Returning result");
	return c.text("example1 completed");
});

examples.get("/example2", async (c) => {
	console.log("[/example2] Request received");
	await sleep(3_000);
	console.log("[/example2] Returning result");
	return c.text("example2 completed");
});

examples.get("/example3", async (c) => {
	console.log("[/example3] Request received");
	await sleep(1_000);
	console.log("[/example3] Returning result");
	return c.text("example3 completed");
});

export { examples };
