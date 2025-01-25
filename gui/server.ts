import { ensureDir } from "jsr:@std/fs/ensure-dir";
import {
  type App,
  createVirtualSink,
  listSinks,
  moveAppToSink,
  playingApps,
  playSinkAudio,
  recordFromSink,
} from "../../lib.ts";
import { ensureDirSync } from "jsr:@std/fs";
import { unloadAllVirtualSinks } from "../../lib.ts";

if (import.meta.main) {
  let musicDir = `${Deno.env.get("HOME")}/Music`;
  try {
    await new Deno.Command("xdg-user-dir", { args: ["MUSIC"] }).output().then(
      (out) => {
        const path = new TextDecoder().decode(out.stdout).trim();
        if (path.length > 0) {
          musicDir = path;
        }
      },
    );
  } catch {
    /* noop */
  }
  const recordAppsDir = `${musicDir}/RecordApps`;
  ensureDirSync(recordAppsDir);

  await unloadAllVirtualSinks();
  const originalSink = await listSinks().then((sinks) => sinks.at(0));
  if (originalSink === undefined) {
    throw new Error("No sinks found");
  }

  const recordings = new Map<number, AbortController>();
  const playing = new Map<number, AbortController>();
  Deno.serve({ port: 3000 }, async (req) => {
    // Add CORS headers
    const headers = new Headers({
      "Access-Control-Allow-Origin": "*", // Allow all origins
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    });

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (req.url.endsWith("/apps")) {
      const apps = await playingApps();
      return new Response(JSON.stringify(apps), { headers });
    }

    if (req.url.endsWith("/record")) {
      const app = await req.json() as App;
      const currentSinks = await listSinks();
      if (currentSinks.find((s) => s.name === app.name) === undefined) {
        const _virtualSinkId = await createVirtualSink({ name: app.name });
      }
      const virtualSink = await listSinks().then((sinks) =>
        sinks.find((s) => s.name === app.name)
      );
      if (virtualSink === undefined) {
        return new Response("Sink not found", { status: 404, headers });
      }
      await moveAppToSink({ app, sink: virtualSink });

      const abortController = new AbortController();
      recordings.set(app.id, abortController);
      await ensureDir(`${recordAppsDir}/${app.name}`);
      const timestamp = new Date().toISOString()
        .replace(/[:.]/g, "-") // Replace colons and dots with hyphens
        .replace("T", "_"); // Replace T with underscore for better readability
      recordFromSink(
        {
          sink: virtualSink,
          outputFile: `${recordAppsDir}/${app.name}/${timestamp}.flac`,
          abortController,
        },
      );
      return new Response("Recording", { headers });
    }

    if (req.url.endsWith("/stop-recording")) {
      const app = await req.json() as App;
      const abortController = recordings.get(app.id);
      if (abortController === undefined) {
        return new Response("Recording not found", { status: 404, headers });
      }
      abortController.abort();
      await moveAppToSink({ app, sink: originalSink });
      recordings.delete(app.id);
      return new Response("Recording stopped", { headers });
    }

    if (req.url.endsWith("/play")) {
      const app = await req.json() as App;
      const virtualSink = await listSinks().then((sinks) =>
        sinks.find((s) => s.name === app.name)
      );
      if (virtualSink === undefined) {
        return new Response("Sink not found", { status: 404, headers });
      }
      const abortController = new AbortController();
      playing.set(app.id, abortController);
      playSinkAudio(virtualSink, abortController);

      return new Response("Playing", { headers });
    }

    if (req.url.endsWith("/stop-playing")) {
      const app = await req.json() as App;
      const abortController = playing.get(app.id);
      if (abortController === undefined) {
        return new Response("Playing not found", { status: 404, headers });
      }
      abortController.abort();
      playing.delete(app.id);
      return new Response("Playing stopped", { headers });
    }

    return new Response("Not found", {
      status: 404,
      headers,
    });
  });
}
