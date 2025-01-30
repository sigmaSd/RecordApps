import { Webview } from "jsr:@webview/webview@0.9.0";

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
