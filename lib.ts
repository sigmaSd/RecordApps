export interface App {
  appName: string;
  mediaName: string;
  serial: number;
}

export interface Sink {
  serial: number;
  name: string;
  ownerModule: number;
}

export async function playingApps(): Promise<App[]> {
  const output = await new Deno.Command("pactl", {
    args: ["--format=json", "list", "sink-inputs"],
  })
    .output()
    .then((o) => new TextDecoder().decode(o.stdout))
    .then((o) => JSON.parse(o));

  return output.map((appData: any) => {
    return {
      appName: appData.properties["application.name"],
      mediaName: appData.properties["media.name"],
      serial: Number.parseInt(appData.properties["object.serial"]),
    };
  })
    .filter((app: any) => app.appName !== "pacat");
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
    args.push(`sink_name=${name}`);
  }

  await new Deno.Command("pactl", {
    args,
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
  }).spawn().status;
}

export async function removeAllVirtualSinks(): Promise<void> {
  await new Deno.Command("pactl", {
    args: ["unload-module", "module-null-sink"],
    stderr: "null",
  }).spawn().status;
}

export async function listSinks(): Promise<Sink[]> {
  const output = await new Deno.Command("pactl", {
    args: ["--format=json", "list", "sinks"],
  })
    .output()
    .then((o) => new TextDecoder().decode(o.stdout))
    .then((output) => JSON.parse(output));

  // deno-lint-ignore no-explicit-any
  return output.map((sinkData: any) => {
    return {
      name: sinkData.name,
      serial: Number.parseInt(sinkData.properties["object.serial"]),
      ownerModule: Number.parseInt(sinkData.owner_module),
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
