import {main as frontMain} from "./front-server.ts"
import {main as serverMain} from "./server.ts"


if (import.meta.main) {
  main()
}

export async function main() {
  serverMain()
  frontMain()
}
