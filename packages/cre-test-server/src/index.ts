import { Hono } from "hono";
import { auth } from "./routes/auth";
import { examples } from "./routes/examples";

const app = new Hono().basePath("/api/v1");

app.route("/auth", auth);
app.route("/", examples);

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;

console.log(`Starting test server on port ${port}...`);

export default {
	port,
	fetch: app.fetch,
};
