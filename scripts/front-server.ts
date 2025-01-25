import { serveDir } from "jsr:@std/http/file-server";

if (import.meta.main) {
  main();
}

export async function main() {
  Deno.serve((req) => {
    const pathname = new URL(req.url).pathname;
    if (pathname.startsWith("/")) {
      return serveDir(req, {
        fsRoot: ".",
      });
    }
    return new Response();
  });
}
