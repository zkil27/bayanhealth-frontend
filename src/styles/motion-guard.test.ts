import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards for the micro-interaction pass (CHANGELOG_UI_MI.md): reduced motion,
 * the animation performance budget, the repo's no-ping rule, and the
 * HoldToRelease safety constraint. These read source files; nothing renders.
 */

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const GLOBALS = readFileSync(join(SRC, "app", "globals.css"), "utf8");

/** Contents between the `{` at or after `from` and its matching `}`. */
function blockAt(css: string, from: number): string {
  const open = css.indexOf("{", from);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error("Unbalanced braces");
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function reducedMotionBlocks(css: string): string[] {
  const clean = stripComments(css);
  const blocks: string[] = [];
  const pattern = /@media[^{]*prefers-reduced-motion:\s*reduce[^{]*\{/g;
  for (let match = pattern.exec(clean); match; match = pattern.exec(clean)) {
    blocks.push(blockAt(clean, match.index));
  }
  return blocks;
}

function sourceFiles(dir: string, extensions: readonly string[]): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full, extensions));
    else if (extensions.some((ext) => name.endsWith(ext))) out.push(full);
  }
  return out;
}

const reduced = reducedMotionBlocks(GLOBALS).join("\n");

describe("reduced motion", () => {
  it("has a global prefers-reduced-motion block in globals.css", () => {
    expect(reduced.length).toBeGreaterThan(0);
  });

  it("neutralises every tw-animate-css movement variable", () => {
    const neutral: Record<string, string> = {
      "translate-x": "0",
      "translate-y": "0",
      scale: "1",
      rotate: "0",
      blur: "0",
    };
    for (const phase of ["enter", "exit"]) {
      for (const [prop, value] of Object.entries(neutral)) {
        expect(reduced).toMatch(new RegExp(`--tw-${phase}-${prop}:\\s*${value}\\s*!important`));
      }
    }
  });

  it("gives every custom animation class a reduced-motion counterpart", () => {
    const clean = stripComments(GLOBALS);
    const names = new Set<string>();
    for (const match of clean.matchAll(/^\.animate-([a-z0-9-]+)\s*\{/gm)) names.add(match[1]);
    for (const match of clean.matchAll(/--animate-([a-z0-9-]+):/g)) names.add(match[1]);
    expect(names.size).toBeGreaterThan(0);
    for (const name of names) {
      expect(reduced, `.animate-${name} has no reduced-motion rule`).toContain(`.animate-${name}`);
    }
  });

  it("never shortens transitions (HoldToReleaseButton needs its full 2s hold)", () => {
    const cssFiles = sourceFiles(SRC, [".css"]);
    for (const file of cssFiles) {
      for (const block of reducedMotionBlocks(readFileSync(file, "utf8"))) {
        expect(block, relative(ROOT, file)).not.toMatch(/transition(-duration)?\s*:/);
      }
    }
  });
});

describe("animation budget", () => {
  it("keyframes in globals.css animate only compositor-friendly properties", () => {
    const allowed = new Set(["transform", "opacity", "scale", "translate", "stroke-dashoffset"]);
    const clean = stripComments(GLOBALS);
    const pattern = /@keyframes\s+([a-z0-9-]+)\s*\{/g;
    let count = 0;
    for (let match = pattern.exec(clean); match; match = pattern.exec(clean)) {
      count += 1;
      const body = blockAt(clean, match.index);
      for (const decl of body.matchAll(/([a-z-]+)\s*:/g)) {
        expect(allowed.has(decl[1]), `@keyframes ${match[1]} animates ${decl[1]}`).toBe(true);
      }
    }
    expect(count).toBeGreaterThan(0);
  });

  it("uses no ping or bounce animations anywhere in src", () => {
    const self = join(SRC, "styles", "motion-guard.test.ts");
    for (const file of sourceFiles(SRC, [".ts", ".tsx", ".css"])) {
      if (file === self) continue;
      const text = readFileSync(file, "utf8");
      expect(text, relative(ROOT, file)).not.toMatch(/\banimate-(ping|bounce)\b/);
    }
  });
});

describe("press feedback", () => {
  it("does not mount the global TapFeedback ripple (controls own their press state)", () => {
    const layout = readFileSync(join(SRC, "app", "layout.tsx"), "utf8");
    expect(layout).not.toMatch(/<TapFeedback\b/);
  });
});
