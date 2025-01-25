import { serveDir } from "jsr:@std/http/file-server";

if (import.meta.main) {
  main();
}

export function main() {
  Deno.serve((req) => {
    const pathname = new URL(req.url).pathname;
    if (pathname.startsWith("/")) {
      return serveDir(req, {
        fsRoot: import.meta.dirname,
      });
    }
    return new Response();
  });
}
