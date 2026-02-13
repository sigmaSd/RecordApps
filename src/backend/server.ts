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
  removeVirtualSink,
  Sink,
} from "./lib.ts";
import { ensureDirSync } from "@std/fs";
import { removeAllVirtualSinks } from "./lib.ts";
import { newWebSocketRpcSession, RpcTarget } from "capnweb";

if (import.meta.main) {
  await main(Deno.args.map(Number.parseInt).at(0));
}

class RecordServer extends RpcTarget implements RecordRpc {
  #recordings: Map<number, { controller: AbortController; filePath: string }>;
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
      recordings: Map<
        number,
        { controller: AbortController; filePath: string }
      >;
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

  async record(app: App, format: string = "opus") {
    const sinkName = `${app.appName}-${app.serial}`;
    let virtualSink = await findSinkByName(sinkName);
    if (virtualSink === undefined) {
      virtualSink = await createVirtualSink({ name: sinkName });
    }
    await moveAppToSink({ app, sink: virtualSink });

    const abortController = new AbortController();
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, "-") // Replace colons and dots with hyphens
      .replace("T", "_"); // Replace T with underscore for better readability
    const filePath =
      `${this.#recordAppsDir}/${app.appName}/${timestamp}.${app.serial}.${format}`;

    this.#recordings.set(app.serial, { controller: abortController, filePath });
    await ensureDir(`${this.#recordAppsDir}/${app.appName}`);

    recordFromSink(
      {
        sink: virtualSink,
        outputFile: filePath,
        abortController,
      },
    );
  }

  async stopRecord(app: App): Promise<string> {
    const recordingData = this.#recordings.get(app.serial);
    if (recordingData === undefined) {
      throw new Error("Recording not found");
    }
    const { controller, filePath } = recordingData;

    const playingAbortController = this.#playing.get(app.serial);
    if (playingAbortController !== undefined) {
      playingAbortController.abort();
      this.#playing.delete(app.serial);
    }

    controller.abort();
    try {
      await moveAppToSink({ app, sink: this.#defaultSink });
    } catch {
      // App might be gone, ignore
    }

    const sinkName = `${app.appName}-${app.serial}`;
    const virtualSink = await findSinkByName(sinkName);
    if (virtualSink) {
      await removeVirtualSink(virtualSink);
    }

    this.#recordings.delete(app.serial);
    return filePath;
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

  getDownloadPath() {
    return this.#recordAppsDir;
  }

  openDownloadFolder() {
    new Deno.Command("xdg-open", {
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

  const recordings = new Map<
    number,
    { controller: AbortController; filePath: string }
  >();
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
