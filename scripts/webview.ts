import { Webview } from "jsr:@sigmasd/webview-deno";

const worker = new Worker(import.meta.resolve("./start.ts"), {
  type: "module",
});
const webview = new Webview();
webview.title = "Record Apps";

webview.navigate("http://localhost:8000");
webview.run();

worker.terminate();
