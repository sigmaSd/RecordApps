import { Webview } from "jsr:@webview/webview@0.8.1";

const worker = new Worker(import.meta.resolve("./start.ts"), {
  type: "module",
});
const webview = new Webview();
webview.title = "Record Apps";

webview.navigate("http://localhost:8000");
webview.run();

worker.terminate();
