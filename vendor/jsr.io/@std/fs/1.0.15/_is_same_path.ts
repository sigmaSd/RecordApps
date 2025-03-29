// Copyright 2018-2025 the Deno authors. MIT license.
// Copyright the Browserify authors. MIT License.

import { resolve } from "jsr:@std/path@^1.0.8/resolve";
import { toPathString } from "./_to_path_string.ts";

/**
 * Checks if two paths are the same.
 *
 * @param src Source file path as a string or URL.
 * @param dest Destination file path as a string or URL.
 *
 * @returns `true` if the paths are the same, `false` otherwise.
 */
export function isSamePath(
  src: string | URL,
  dest: string | URL,
): boolean {
  src = toPathString(src);
  dest = toPathString(dest);

  return resolve(src) === resolve(dest);
}
