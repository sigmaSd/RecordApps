import { assert } from "jsr:@std/assert@1";
import {
  createVirtualSink,
  listSinks,
  unloadAllVirtualSinks,
  unloadSink,
} from "./lib.ts";

Deno.test("smoke", async () => {
  {
    const virtualSinkId = await createVirtualSink({ name: "virtualSink" });
    assert((await listSinks()).find((sink) => sink.name === "virtualSink"));
    await unloadSink(virtualSinkId);
    assert(
      (await listSinks())
        .find(
          (sink) => sink.name === "virtualSink",
        ) === undefined,
    );
  }
  {
    await createVirtualSink({ name: "virtualSink2" });
    assert((await listSinks()).find((sink) => sink.name === "virtualSink2"));
    await unloadAllVirtualSinks();
    assert(!(await listSinks()).find((sink) => sink.name === "virtualSink2"));
  }
});
