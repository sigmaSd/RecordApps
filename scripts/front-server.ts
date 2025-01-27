import { serveDir } from "jsr:@std/http/file-server";

if (import.meta.main) {
  main({ apiPort: 8000 });
}

export async function main({ apiPort }: { apiPort: number }) {
  let port = undefined;
  Deno.serve({
    port: 0,
    onListen: ({ port: p }) => {
      port = p;
    },
  }, (req) => {
    const pathname = new URL(req.url).pathname;

    if (pathname === "/apiPort") {
      return new Response(apiPort.toString());
    }
    if (pathname.startsWith("/")) {
      return serveDir(req, {
        fsRoot: import.meta.dirname,
      });
    }

    return new Response();
  });

  while (port === undefined) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return { port };
}
