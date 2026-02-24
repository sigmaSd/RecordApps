export interface App {
  appName: string;
  mediaName: string;
  serial: number;
  id: number;
}

export interface Sink {
  serial: number;
  name: string;
  ownerModule: number;
  id: number;
}

export interface PinConfig {
  autoRecord: boolean;
  autoListen: boolean;
}

export type PinnedApps = Record<string, PinConfig>;

interface PipeWireObject {
  id: number;
  type: string;
  info: {
    props: Record<string, string>;
  };
}
export interface RecordRpc {
  apps: () => Promise<App[]>;
  record: (app: App, format?: string) => Promise<void>;
  stopRecord: (app: App) => Promise<string>;
  play: (app: App) => Promise<void>;
  stopPlay: (app: App) => void;
  getDownloadPath: () => string;
  openDownloadFolder: () => void;
  getPinnedApps: () => Promise<PinnedApps>;
  setPinnedApps: (pinnedApps: PinnedApps) => Promise<void>;
}

export async function playingApps(): Promise<App[]> {
  const output: PipeWireObject[] = await new Deno.Command("pw-dump", {
    args: [],
  })
    .output()
    .then((o) => JSON.parse(new TextDecoder().decode(o.stdout)));

  return output
    .filter((obj) =>
      obj.type === "PipeWire:Interface:Node" &&
      obj.info?.props?.["media.class"] === "Stream/Output/Audio"
    )
    .map((appData) => {
      const props = appData.info.props;
      return {
        appName: props["application.name"] || props["node.name"] || "Unknown",
        mediaName: props["media.name"] || props["node.name"] || "Unknown",
        serial: Number.parseInt(props["object.serial"]),
        id: appData.id,
      };
    })
    .filter((app: App) =>
      app.appName !== "pw-record" && app.appName !== "pw-play" &&
      app.appName !== "speech-dispatcher-dummy"
    );
}

/**
 * Creates a virtual audio sink.
 *
 * @param {object} options - The options for creating the virtual sink.
 * @param {string} options.name - The name of the virtual sink.
 * @returns {Promise<Sink>} A promise that resolves with the created sink.
 * @throws {Error} If the sink is not found after creation.
 */
export async function createVirtualSink({
  name,
}: { name: string }): Promise<Sink> {
  const args = ["load-module", "module-null-sink"];
  if (name !== undefined) {
    args.push(`sink_name="${name}"`);
  }

  await new Deno.Command("pactl", {
    args,
    stdout: "null",
  }).spawn().status;
  const sink = await findSinkByName(name);
  if (sink === undefined) {
    throw new Error("Sink not found");
  }
  return sink;
}

export async function removeVirtualSink(sink: Sink): Promise<void> {
  await new Deno.Command("pactl", {
    args: ["unload-module", sink.ownerModule.toString()],
    stderr: "null",
  }).spawn().status;
}

export async function removeAllVirtualSinks(): Promise<void> {
  await new Deno.Command("pactl", {
    args: ["unload-module", "module-null-sink"],
    stderr: "null",
  }).spawn().status;
}

export async function listSinks(): Promise<Sink[]> {
  const output: PipeWireObject[] = await new Deno.Command("pw-dump", {
    args: [],
  })
    .output()
    .then((o) => JSON.parse(new TextDecoder().decode(o.stdout)));

  return output
    .filter((obj) =>
      obj.type === "PipeWire:Interface:Node" &&
      obj.info?.props?.["media.class"] === "Audio/Sink"
    )
    .map((sinkData) => {
      const props = sinkData.info.props;
      return {
        name: props["node.name"],
        serial: Number.parseInt(props["object.serial"]),
        id: sinkData.id,
        ownerModule: Number.parseInt(props["pulse.module.id"] || "0"),
      };
    });
}

export async function moveAppToSink({
  app,
  sink,
}: {
  app: App;
  sink: Sink;
}): Promise<void> {
  await new Deno.Command("pw-metadata", {
    args: [
      "-n",
      "default",
      app.id.toString(),
      "target.node",
      sink.id.toString(),
    ],
    stderr: "null",
  }).spawn().status;
}

export async function recordFromSink(
  { sink, outputFile, abortController }: {
    sink: Sink;
    outputFile: string;
    abortController?: AbortController;
  },
): Promise<void> {
  await new Deno.Command("ffmpeg", {
    args: ["-f", "pulse", "-i", `${sink.name}.monitor`, outputFile],
    stderr: "null",
    signal: abortController?.signal,
  }).spawn().status;
}

export async function playSinkAudio(
  sink: Sink,
  abortController?: AbortController,
): Promise<void> {
  const pwRecord = new Deno.Command("pw-record", {
    args: [
      "--target",
      sink.serial.toString(),
      "--format=s16",
      "--rate=44100",
      "--channels=2",
      "-",
    ],
    stdout: "piped",
    signal: abortController?.signal,
  }).spawn();
  const pwPlay = new Deno.Command("pw-play", {
    args: ["--format=s16", "--rate=44100", "--channels=2", "-"],
    stdin: "piped",
    signal: abortController?.signal,
  }).spawn();

  const pwRecordReader = pwRecord.stdout.getReader();
  const pwPlayWriter = pwPlay.stdin.getWriter();

  while (true) {
    const { done, value } = await pwRecordReader.read();
    if (done) break;
    await pwPlayWriter.write(value);
  }
}

export async function getDefaultSink(): Promise<Sink | undefined> {
  const output = await new Deno.Command("pw-metadata", {
    args: ["-n", "default", "0", "default.audio.sink"],
  })
    .output()
    .then((o) => new TextDecoder().decode(o.stdout));

  // Example output: update: id:0 key:'default.audio.sink' value:'{"name":"alsa_output.pci-0000_00_1b.0.analog-stereo"}' type:'Spa:String:JSON'
  const match = output.match(/'default\.audio\.sink'.*value:'(.*)' type/);
  if (match) {
    try {
      const value = JSON.parse(match[1]);
      return findSinkByName(value.name);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function findSinkByName(name: string): Promise<Sink | undefined> {
  const sinks = await listSinks();
  return sinks.find((s) => s.name === name);
}
