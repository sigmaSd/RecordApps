import { SizeHint, Webview } from "jsr:@webview/webview@0.9.0";
import { removeAllVirtualSinks } from "../lib.ts";

const worker = new Worker(import.meta.resolve("./start.ts"), {
  type: "module",
});
const webview = new Webview();
webview.title = "Record Apps";
webview.size = { width: 1000, height: 600, hint: SizeHint.NONE };

worker.onmessage = async (e) => {
  const { port } = e.data;
  webview.navigate(`http://localhost:${port}`);
  webview.run();
  worker.terminate();
  await removeAllVirtualSinks();
  Deno.exit(0);
};
