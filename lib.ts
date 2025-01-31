import { zip } from "jsr:@std/collections@1";

export interface App {
  appName: string;
  mediaName: string;
  serial: number;
}

export interface Sink {
  serial: number;
  name: string;
}

export async function playingApps(): Promise<App[]> {
  const output = await new Deno.Command("pactl", {
    args: ["list", "sink-inputs"],
  })
    .output()
    .then((o) => new TextDecoder().decode(o.stdout));

  const appNames = [...output.matchAll(/application\.name = "(.*?)"/g)].map(
    (m) => m[1],
  );
  const mediaNames = [...output.matchAll(/media\.name = "(.*?)"/g)].map((m) =>
    m[1]
  );
  const serials = [...output.matchAll(/object\.serial = "(\d+)"/g)].map((m) =>
    Number.parseInt(m[1], 10)
  );

  const apps = zip(appNames, mediaNames, serials)
    .map(([appName, mediaName, serial]) => ({ appName, mediaName, serial }))
    .filter((app) => !Number.isNaN(app.serial) && app.appName !== "pacat");

  return apps;
}

/**
 * Creates a virtual audio sink.
 * @param {Object} options - Optional parameters for creating the virtual sink.
 * @param {string} options.name - Optional name for the virtual sink. The name should be unique.
 * @returns {Promise<number>} The ID of the newly created sink.
 */
export async function createVirtualSink({
  name,
}: { name?: string } = {}): Promise<number> {
  const args = ["load-module", "module-null-sink"];
  if (name !== undefined) {
    args.push(`sink_name=${name}`);
  }

  const id = await new Deno.Command("pactl", {
    args,
  })
    .output()
    .then((o) => new TextDecoder().decode(o.stdout));
  return Number.parseInt(id);
}

export async function unloadSink(id: number): Promise<void> {
  await new Deno.Command("pactl", {
    args: ["unload-module", id.toString()],
  }).spawn().status;
}

export async function unloadAllVirtualSinks(): Promise<void> {
  await new Deno.Command("pactl", {
    args: ["unload-module", "module-null-sink"],
    stderr: "null",
  }).spawn().status;
}

export async function listSinks(): Promise<Sink[]> {
  const output = await new Deno.Command("pactl", {
    args: ["list", "short", "sinks"],
  })
    .output()
    .then((o) => new TextDecoder().decode(o.stdout));

  const sinks: Sink[] = [];
  for (const line of output.trim().split("\n")) {
    const parts = line.split(/\s+/);
    const index = parts.at(0);
    const name = parts.at(1);
    if (index === undefined || name === undefined) continue;
    sinks.push({
      serial: Number.parseInt(index, 10),
      name,
    });
  }

  return sinks;
}

export async function moveAppToSink({
  app,
  sink,
}: {
  app: App;
  sink: Sink;
}): Promise<void> {
  await new Deno.Command("pactl", {
    args: ["move-sink-input", app.serial.toString(), sink.serial.toString()],
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
  const pacatRecord = new Deno.Command("pacat", {
    args: ["--record", "-d", sink.serial.toString()],
    stdout: "piped",
    signal: abortController?.signal,
  }).spawn();
  const pacatPlay = new Deno.Command("pacat", {
    args: ["--playback"],
    stdin: "piped",
    signal: abortController?.signal,
  }).spawn();

  const pacatRecordReader = pacatRecord.stdout.getReader();
  const pacatPlayWriter = pacatPlay.stdin.getWriter();

  while (true) {
    const { done, value } = await pacatRecordReader.read();
    if (done) break;
    await pacatPlayWriter.write(value);
  }
}

export async function getDefaultSink(): Promise<Sink | undefined> {
  const name = await new Deno.Command("pactl", {
    args: ["get-default-sink"],
  })
    .output()
    .then((o) => new TextDecoder().decode(o.stdout))
    .then((output) => output.trim());
  return findSinkByName(name);
}

export async function findSinkByName(name: string): Promise<Sink | undefined> {
  const sinks = await listSinks();
  return sinks.find((s) => s.name === name);
}
