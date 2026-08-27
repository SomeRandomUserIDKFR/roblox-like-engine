/**
 * One-shot Python-style expression evaluator for calculations.
 * Declared in scripts as: py("2 ** 8 + math.sqrt(9)")
 *
 * Not a live binding / watcher — call py() whenever you need a value.
 * Supports a small math-focused subset (not full Python).
 */

const MATH_NAMES: Record<string, number | ((...a: number[]) => number)> = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  sqrt: Math.sqrt,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  atan2: Math.atan2,
  log: Math.log,
  log10: Math.log10,
  exp: Math.exp,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
};

/**
 * Evaluate a Python-like expression once. Returns number | boolean | string | null.
 */
export function py(expr: string): number | boolean | string | null {
  const raw = expr.trim();
  if (!raw) return null;

  let code = raw;
  // Booleans / None
  code = code.replace(/\bTrue\b/g, "true");
  code = code.replace(/\bFalse\b/g, "false");
  code = code.replace(/\bNone\b/g, "null");
  // Logical
  code = code.replace(/\band\b/g, "&&");
  code = code.replace(/\bor\b/g, "||");
  code = code.replace(/\bnot\b/g, "!");
  // Floor div // → Math.floor(a/b) is hard with regex; map ** only
  // Power ** is already JS
  // math.x → x from MATH_NAMES
  code = code.replace(/\bmath\./g, "");

  // Reject obvious statements / imports
  if (
    /\b(import|def|class|for|while|return|lambda|yield|with|as|from)\b/.test(
      code,
    )
  ) {
    throw new Error(
      `py(): only expressions allowed (got statement-like code)`,
    );
  }

  const argNames = Object.keys(MATH_NAMES);
  const argVals = Object.values(MATH_NAMES);

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(...argNames, `"use strict"; return (${code});`);
    const result = fn(...argVals);
    if (
      typeof result === "number" ||
      typeof result === "boolean" ||
      typeof result === "string" ||
      result === null
    ) {
      return result;
    }
    if (result === undefined) return null;
    return Number(result);
  } catch (err) {
    throw new Error(`py(${JSON.stringify(expr)}): ${err}`);
  }
}
