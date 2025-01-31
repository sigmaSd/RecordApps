import { Webview } from "jsr:@webview/webview@0.9.0";
import { unloadAllVirtualSinks } from "../lib.ts";

const worker = new Worker(import.meta.resolve("./start.ts"), {
  type: "module",
});
const webview = new Webview();
webview.title = "Record Apps";

worker.onmessage = async (e) => {
  const { port } = e.data;
  webview.navigate(`http://localhost:${port}`);
  webview.run();
  worker.terminate();
  await unloadAllVirtualSinks();
  Deno.exit(0);
};
