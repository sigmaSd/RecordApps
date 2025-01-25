export interface App {
  name: string;
  id: number;
}

export interface Sink {
  index: number;
  name: string;
}

export async function playingApps(): Promise<App[]> {
  const output = await new Deno.Command("pactl", {
    args: ["list", "sink-inputs"],
  })
    .output()
    .then((o) => new TextDecoder().decode(o.stdout));

  const apps = Array.from(
    output
      .matchAll(/application\.name = "(.*?)".*?object\.serial = "(\d+)"/gs)
      .map((match) => ({
        name: match[1],
        id: Number.parseInt(match[2], 10),
      }))
      .filter((app) => !Number.isNaN(app.id)),
  );

  return apps;
}

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
      index: Number.parseInt(index, 10),
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
    args: ["move-sink-input", app.id.toString(), sink.index.toString()],
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
    args: ["-f", "pulse", "-i", sink.name, outputFile],
    stderr: "null",
    signal: abortController?.signal,
  }).spawn().status;
}

export async function playSinkAudio(
  sink: Sink,
  abortController?: AbortController,
): Promise<void> {
  const pacatRecord = new Deno.Command("pacat", {
    args: ["--record", "-d", sink.index.toString()],
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
