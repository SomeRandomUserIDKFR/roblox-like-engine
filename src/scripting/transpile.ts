import { transform as sucraseTransform } from "sucrase";

/** Transpile TypeScript to plain JS for script VMs. */
export function transpileTs(
  source: string,
  fileName = "script.ts",
  asModule = false,
): string {
  try {
    const transforms: Array<"typescript" | "imports"> = ["typescript"];
    if (asModule) transforms.push("imports");
    const out = sucraseTransform(source, {
      transforms,
      filePath: fileName,
    });
    return out.code;
  } catch (err) {
    throw new Error(`TypeScript transpile failed (${fileName}): ${err}`);
  }
}
