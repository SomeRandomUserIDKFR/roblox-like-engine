import { Instance } from "./Instance";

/**
 * Shared source container for Script / ModuleScript (TypeScript source).
 */
export abstract class SourceScript extends Instance {
  /** TypeScript (or JS) source. Transpiled at Play. */
  source: string;
  enabled = true;

  constructor(name: string, source: string) {
    super(name);
    this.source = source;
  }
}

const DEFAULT_SCRIPT = `// Script — runs when you hit Play
print("Hello from", script.name);

// One-shot Python-style math (not a live binding):
const n = py("2 ** 8 + 3");
print("py calc:", n);

// Modules: const m = require("ModuleName");
`;

const DEFAULT_MODULE = `// ModuleScript — require("Name") from a Script
export function double(x: number) {
  return x * 2;
}

export function area(w: number, h: number) {
  return py(\`\${w} * \${h}\`);
}
`;

/**
 * Runs once at Play start (client-side — no separate server yet).
 * Roblox LocalScript ≈ this; we keep one Script type for simplicity.
 */
export class Script extends SourceScript {
  constructor(name = "Script", source = DEFAULT_SCRIPT) {
    super(name, source);
  }
}

/**
 * Modular script — `require(module)` / `require("Name")` from Scripts.
 * Call exported functions externally.
 */
export class ModuleScript extends SourceScript {
  constructor(name = "ModuleScript", source = DEFAULT_MODULE) {
    super(name, source);
  }
}
