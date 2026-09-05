import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const publicDirectory = fileURLToPath(new URL("./public/", import.meta.url));
const port = Number.parseInt(process.env.PORT ?? "8099", 10);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json"],
]);

async function readRuntimeConfig() {
  let homeAssistantUrl = process.env.HOME_ASSISTANT_URL ?? "http://homeassistant.local:8123";

  try {
    const options = JSON.parse(await readFile("/data/options.json", "utf8"));
    if (typeof options.home_assistant_url === "string" && options.home_assistant_url.trim()) {
      homeAssistantUrl = options.home_assistant_url.trim();
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn("Unable to read /data/options.json; using the default URL.", error);
    }
  }

  return { homeAssistantUrl: homeAssistantUrl.replace(/\/$/, "") };
}

function send(response, status, body, contentType) {
  response.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": contentType.startsWith("text/html") ? "no-cache" : "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
  });
  response.end(body);
}

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (requestUrl.pathname === "/runtime-config.json") {
      send(response, 200, JSON.stringify(await readRuntimeConfig()), "application/json; charset=utf-8");
      return;
    }

    const requestedPath = requestUrl.pathname === "/" ? "index.html" : requestUrl.pathname.slice(1);
    const normalizedPath = normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, "");
    let filePath = join(publicDirectory, normalizedPath);
    let body;

    try {
      body = await readFile(filePath);
    } catch (error) {
      if (error?.code !== "ENOENT" && error?.code !== "EISDIR") throw error;
      filePath = join(publicDirectory, "index.html");
      body = await readFile(filePath);
    }

    send(response, 200, body, contentTypes.get(extname(filePath)) ?? "application/octet-stream");
  } catch (error) {
    console.error(error);
    send(response, 500, "Internal server error", "text/plain; charset=utf-8");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`HA Dash is listening on port ${port}`);
});

