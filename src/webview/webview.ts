import { SizeHint, Webview } from "@webview/webview";
import { Application, ApplicationWindow } from "@sigmasd/gtk/gtk";
import { removeAllVirtualSinks } from "../backend/lib.ts";

if (import.meta.main) {
  const worker = new Worker(import.meta.resolve("./app.worker.ts"), {
    type: "module",
  });
  const port = await new Promise<number>((resolve) => {
    worker.onmessage = (e) => {
      const { port } = e.data;
      resolve(port);
    };
  });

  const app = new Application("io.github.sigmasd.recordapps", 0);

  app.onActivate(() => {
    const window = new ApplicationWindow(app);
    window.setTitle("Record Apps");
    window.setDefaultSize(1000, 800);

    const webview = new Webview(false, undefined, window.ptr);
    webview.bind("show_app", () => {
      window.setVisible(true);
    });
    webview.title = "Record Apps";
    webview.size = { width: 1000, height: 800, hint: SizeHint.NONE };

    webview.navigate(`http://localhost:${port}`);
  });

  app.run(Deno.args);
  worker.terminate();
  await removeAllVirtualSinks();
  Deno.exit(0);
}