import * as path from "https://deno.land/std@0.204.0/path/mod.ts";
import { parseToCreatorJSON } from "./parse.ts";

export async function parseAll() {
  const currentDir = path.dirname(path.fromFileUrl(import.meta.url));

  const excludedFiles = ["deno.json"];

  for await (const file of Deno.readDir(currentDir)) {
    if (file.name.endsWith("json") && !excludedFiles.includes(file.name)) {
      await parseToCreatorJSON(path.resolve(currentDir, file.name));
    }
  }
}

if (import.meta.main) await parseAll();
