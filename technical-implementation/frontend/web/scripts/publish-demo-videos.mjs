import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const testResultsDir = path.join(rootDir, "test-results");
const outputDir = path.join(rootDir, "demo-videos");

const sections = [
  { key: "auth", label: "Auth", spec: "auth-flow.demo.ts" },
  { key: "patients", label: "Patient registry", spec: "patient-registry.demo.ts" },
  { key: "patient-detail", label: "Patient detail", spec: "patient-detail.demo.ts" },
  { key: "registration", label: "Patient registration", spec: "patient-registration.demo.ts" },
  { key: "immunizations", label: "Immunizations", spec: "immunizations.demo.ts" },
  { key: "surveillance", label: "Surveillance", spec: "surveillance.demo.ts" },
  { key: "self-service", label: "Patient self-service", spec: "self-service.demo.ts" },
  { key: "caregiver", label: "Caregiver portal", spec: "caregiver-portal.demo.ts" },
  { key: "risk-map", label: "Risk map", spec: "risk-map.demo.ts" },
  { key: "defaulters", label: "Defaulter clusters", spec: "defaulters.demo.ts" },
];

function walk(dir) {
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function findLatestVideo(spec) {
  const candidates = walk(testResultsDir)
    .filter((file) => file.endsWith(".webm"))
    .filter((file) => path.basename(path.dirname(file)).includes(spec))
    .map((file) => ({ file, mtimeMs: statSync(file).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return candidates[0]?.file ?? null;
}

mkdirSync(outputDir, { recursive: true });

const lines = [
  "# NVOMS Demo Videos",
  "",
  "These files are generated from Playwright output by `npm run demo:publish-videos`.",
  "They are ignored by Git and can be regenerated at any time.",
  "",
];

let copied = 0;
for (const section of sections) {
  const source = findLatestVideo(section.spec);
  if (!source) {
    lines.push(`- ${section.label}: not generated yet`);
    continue;
  }

  const destination = path.join(outputDir, `${section.key}.webm`);
  copyFileSync(source, destination);
  copied += 1;
  lines.push(`- ${section.label}: ${destination}`);
}

writeFileSync(path.join(outputDir, "README.md"), `${lines.join("\n")}\n`);

console.log(`Published ${copied} demo video${copied === 1 ? "" : "s"} to:`);
console.log(outputDir);
console.log("");
console.log(lines.slice(5).join("\n"));
