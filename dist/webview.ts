import { SizeHint, Webview } from "jsr:@webview/webview@0.9.0";
import { removeAllVirtualSinks } from "../lib.ts";
import { AdwApp } from "jsr:@sigmasd/adw-app";

if (import.meta.main) {
  const worker = new Worker(import.meta.resolve("./start.ts"), {
    type: "module",
  });
  const port = await new Promise<number>((resolve) => {
    worker.onmessage = (e) => {
      const { port } = e.data;
      resolve(port);
    };
  });

  const app = new AdwApp({ id: "io.github.sigmasd.recordapps" });
  app.run((window) => {
    const webview = new Webview(false, undefined, window);
    webview.title = "Record Apps";
    webview.size = { width: 1000, height: 600, hint: SizeHint.NONE };

    webview.navigate(`http://localhost:${port}`);
  });
  worker.terminate();
  await removeAllVirtualSinks();
  Deno.exit(0);
}
