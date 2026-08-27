import { Instance } from "./Instance";

/**
 * Folder-like container (Roblox Model) — hierarchy only; Parts keep world transforms.
 */
export class Model extends Instance {
  constructor(name = "Model") {
    super(name);
  }
}
