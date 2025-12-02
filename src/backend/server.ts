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
  RecordRpc,
  Sink,
} from "./lib.ts";
import { ensureDirSync } from "@std/fs";
import { removeAllVirtualSinks } from "./lib.ts";
import { newWebSocketRpcSession, RpcTarget } from "capnweb";

if (import.meta.main) {
  await main(Deno.args.map(Number.parseInt).at(0));
}

class RecordServer extends RpcTarget implements RecordRpc {
  #recordings: Map<number, AbortController>;
  #playing: Map<number, AbortController>;
  #recordAppsDir: string;
  #defaultSink: Sink;

  constructor(
    {
      recordings,
      playing,
      recordAppsDir,
      defaultSink,
    }: {
      recordings: Map<number, AbortController>;
      playing: Map<number, AbortController>;
      recordAppsDir: string;
      defaultSink: Sink;
    },
  ) {
    super();
    this.#recordings = recordings;
    this.#playing = playing;
    this.#recordAppsDir = recordAppsDir;
    this.#defaultSink = defaultSink;
  }

  apps() {
    return playingApps();
  }

  async record(app: App) {
    const sinkName = `${app.appName}-${app.serial}`;
    let virtualSink = await findSinkByName(sinkName);
    if (virtualSink === undefined) {
      virtualSink = await createVirtualSink({ name: sinkName });
    }
    await moveAppToSink({ app, sink: virtualSink });

    const abortController = new AbortController();
    this.#recordings.set(app.serial, abortController);
    await ensureDir(`${this.#recordAppsDir}/${app.appName}`);
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, "-") // Replace colons and dots with hyphens
      .replace("T", "_"); // Replace T with underscore for better readability
    recordFromSink(
      {
        sink: virtualSink,
        outputFile:
          `${this.#recordAppsDir}/${app.appName}/${timestamp}.${app.serial}.flac`,
        abortController,
      },
    );
  }
  async stopRecord(app: App) {
    const recordingAbortController = this.#recordings.get(app.serial);
    if (recordingAbortController === undefined) {
      throw new Error("Recording not found");
    }
    const playingAbortController = this.#playing.get(app.serial);
    if (playingAbortController !== undefined) {
      playingAbortController.abort();
      this.#playing.delete(app.serial);
    }

    recordingAbortController.abort();
    await moveAppToSink({ app, sink: this.#defaultSink });
    this.#recordings.delete(app.serial);
  }

  async play(app: App) {
    const sinkName = `${app.appName}-${app.serial}`;
    const virtualSink = await findSinkByName(sinkName);
    if (virtualSink === undefined) {
      throw new Error("Sink not found");
    }
    const abortController = new AbortController();
    this.#playing.set(app.serial, abortController);
    playSinkAudio(virtualSink, abortController);
  }

  stopPlay(app: App) {
    const abortController = this.#playing.get(app.serial);
    if (abortController === undefined) {
      throw new Error("Playing app not found");
    }
    abortController.abort();
    this.#playing.delete(app.serial);
  }

  async getDownloadPath() {
    return this.#recordAppsDir;
  }

  async openDownloadFolder() {
    await new Deno.Command("xdg-open", {
      args: [this.#recordAppsDir],
    }).spawn();
  }
}

export async function main(port?: number): Promise<{ port: number }> {
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

  return new Promise((resolve) => {
    Deno.serve({
      port: port ?? 0,
      hostname: "localhost",
      onListen: ({ port }) => {
        return resolve({ port });
      },
    }, (req) => {
      if (req.url.endsWith("/api")) {
        if (req.headers.get("upgrade") === "websocket") {
          const { socket, response } = Deno.upgradeWebSocket(req);
          socket.addEventListener("open", () => {
            newWebSocketRpcSession(
              socket,
              new RecordServer({
                recordAppsDir,
                defaultSink,
                recordings,
                playing,
              }),
            );
          });
          return response;
        }
      }

      return new Response("Not found", {
        status: 404,
      });
    });
  });
}
