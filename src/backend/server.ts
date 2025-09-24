import { ensureDir } from "@std/fs";
import {
  type App,
  createVirtualSink,
  findSinkByName,
  getDefaultSink,
  moveAppToSink,
  playingApps,
  playSinkAudio,
  recordFromSink,
} from "./lib.ts";
import { ensureDirSync } from "@std/fs";
import { removeAllVirtualSinks } from "./lib.ts";

if (import.meta.main) {
  await main(Deno.args.map(Number.parseInt).at(0));
}

export function main(port?: number): Promise<{ port: number }> {
  return new Promise((resolve) => {
    async function inner() {
      let musicDir = `${Deno.env.get("HOME")}/Music`;
      try {
        await new Deno.Command("xdg-user-dir", { args: ["MUSIC"] }).output()
          .then(
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

      await removeAllVirtualSinks();
      const defaultSink = await getDefaultSink();
      if (defaultSink === undefined) {
        throw new Error("No sinks found");
      }

      const recordings = new Map<number, AbortController>();
      const playing = new Map<number, AbortController>();
      Deno.serve({
        port: port ?? 0,
        hostname: "localhost",
        onListen: ({ port }) => {
          return resolve({ port });
        },
      }, async (req) => {
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
          const sinkName = `${app.appName}-${app.serial}`;
          let virtualSink = await findSinkByName(sinkName);
          if (virtualSink === undefined) {
            virtualSink = await createVirtualSink({ name: sinkName });
          }
          await moveAppToSink({ app, sink: virtualSink });

          const abortController = new AbortController();
          recordings.set(app.serial, abortController);
          await ensureDir(`${recordAppsDir}/${app.appName}`);
          const timestamp = new Date().toISOString()
            .replace(/[:.]/g, "-") // Replace colons and dots with hyphens
            .replace("T", "_"); // Replace T with underscore for better readability
          recordFromSink(
            {
              sink: virtualSink,
              outputFile:
                `${recordAppsDir}/${app.appName}/${timestamp}.${app.serial}.flac`,
              abortController,
            },
          );
          return new Response("Recording", { headers });
        }

        if (req.url.endsWith("/stop-recording")) {
          const app = await req.json() as App;
          const recordingAbortController = recordings.get(app.serial);
          if (recordingAbortController === undefined) {
            return new Response("Recording not found", {
              status: 404,
              headers,
            });
          }
          const playingAbortController = playing.get(app.serial);
          if (playingAbortController !== undefined) {
            playingAbortController.abort();
            playing.delete(app.serial);
          }

          recordingAbortController.abort();
          await moveAppToSink({ app, sink: defaultSink });
          recordings.delete(app.serial);

          return new Response("Recording stopped", { headers });
        }

        if (req.url.endsWith("/play")) {
          const app = await req.json() as App;
          const sinkName = `${app.appName}-${app.serial}`;
          const virtualSink = await findSinkByName(sinkName);
          if (virtualSink === undefined) {
            return new Response("Sink not found", { status: 404, headers });
          }
          const abortController = new AbortController();
          playing.set(app.serial, abortController);
          playSinkAudio(virtualSink, abortController);

          return new Response("Playing", { headers });
        }

        if (req.url.endsWith("/stop-playing")) {
          const app = await req.json() as App;
          const abortController = playing.get(app.serial);
          if (abortController === undefined) {
            return new Response("Playing not found", { status: 404, headers });
          }
          abortController.abort();
          playing.delete(app.serial);
          return new Response("Playing stopped", { headers });
        }

        return new Response("Not found", {
          status: 404,
          headers,
        });
      });
    }
    inner();
  });
}
