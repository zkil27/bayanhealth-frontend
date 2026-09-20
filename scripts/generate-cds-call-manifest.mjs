import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/(.:)/, "$1");
const checkOnly = process.argv.includes("--check");
const bundleRoot = join(root, ".next");
const output = join(root, "docs", "shipped-cds-call-manifest.json");
const retired = [
  "/v1/cds/soap",
  "/v1/cds/patient-cards",
  "/continue",
  "approveCdsDraft",
  "createConsultationDocument",
  "updateConsultationDocument",
];
const assessmentFirstFragments = [
  "/assessment",
  "/assessment/editable",
  "/assessment/confirmations",
  "/assessment/confirmation",
  "/diagnosis-candidate-evaluations",
  "/preview",
  "/selections",
  "/gate-tokens",
  "/red-flag-acknowledgments",
  "/outputs/current",
  "/outputs/history",
  "/plan-generations",
  "/prescription-generations",
  "/final-icd-generations",
  "/medical-certificate-generations",
  "/lab-request-generations",
  "/imaging-request-generations",
  "/patient-education-generations",
  "/finalizations",
  "/releases",
  "/jobs/",
  "/cancellations",
];

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : path.endsWith(".js") ? [path] : [];
  }));
  return nested.flat();
}

let bundleFiles;
try {
  bundleFiles = await files(bundleRoot);
} catch {
  throw new Error("Production bundle not found. Run `npm run build` before generating the CDS call manifest.");
}

const findings = [];
const shipped = new Set();
for (const file of bundleFiles) {
  const source = await readFile(file, "utf8");
  for (const value of retired) if (source.includes(value)) findings.push({ file: relative(root, file), value });
  if (source.includes("/v1/cds/consultations/")) {
    for (const fragment of assessmentFirstFragments) if (source.includes(fragment)) shipped.add(fragment);
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  evidenceScope: ".next production JavaScript bundles",
  contractSource: "../../contracts/openapi.yaml",
  assessmentFirstCallFragments: [...shipped].sort(),
  retiredWritePatterns: retired,
  retiredWriteFindings: findings,
  passed: findings.length === 0,
};
if (!checkOnly) await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
if (findings.length) {
  console.error(JSON.stringify(manifest, null, 2));
  process.exitCode = 1;
} else {
  console.log(`CDS shipped-call manifest passed (${bundleFiles.length} bundle files scanned).`);
}
