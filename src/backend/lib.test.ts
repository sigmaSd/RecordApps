import { assert } from "@std/assert";
import {
  createVirtualSink,
  findSinkByName,
  removeAllVirtualSinks,
  removeVirtualSink,
} from "./lib.ts";

Deno.test("smoke", async () => {
  await removeAllVirtualSinks();
  {
    const sink = await createVirtualSink({ name: "virtualSink" });
    assert(await findSinkByName("virtualSink") !== undefined);
    await removeVirtualSink(sink);
    assert(await findSinkByName("virtualSink") === undefined);
  }
  // biome-ignore lint/complexity/noUselessLoneBlockStatements: <explanation>
  {
    await createVirtualSink({ name: "virtualSink2" });
    assert(await findSinkByName("virtualSink2") !== undefined);
    await removeAllVirtualSinks();
    assert(await findSinkByName("virtualSink") === undefined);
  }
});
