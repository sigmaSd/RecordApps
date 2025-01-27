import { Webview } from "jsr:@sigmasd/webview-temp-fork@0.9.1";

const worker = new Worker(import.meta.resolve("./start.ts"), {
  type: "module",
});
const webview = new Webview();
webview.title = "Record Apps";

worker.onmessage = (e) => {
  const { port } = e.data;
  webview.navigate(`http://localhost:${port}`);
  webview.run();
  worker.terminate();
  Deno.exit(0);
};
