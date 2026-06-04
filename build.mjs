#!/usr/bin/env bun
// Build: assemble content/*.json + template.html -> index.html (single offline file)
// Usage: bun build.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(ROOT, "content");
const expected = JSON.parse(readFileSync(join(ROOT, "topics.json"), "utf8"));

const REQUIRED = ["id", "order", "section", "title", "lesson", "mentalModel", "mistakes", "exercise", "summary", "keyTerms"];
const VALID_IDS = new Set(expected.map(e => e.id));
// Patterns that would break the "single offline file" guarantee.
const FORBIDDEN = [
  [/<script\b/i, "<script> tag"],
  [/<style\b/i, "<style> tag"],
  [/<iframe\b/i, "<iframe> tag"],
  [/<link\b/i, "<link> tag"],
  [/<img\b/i, "<img> tag (external/asset)"],
  [/\bsrc\s*=\s*["']https?:/i, "external src= URL"],
  [/\bhref\s*=\s*["']https?:/i, "external href= URL"],
  [/@import/i, "@import"],
  [/url\(\s*["']?https?:/i, "url(http…) reference"],
];

const errors = [];
const warnings = [];

function words(html) {
  return String(html).replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").trim().split(/\s+/).filter(Boolean).length;
}
function htmlFields(t) {
  // every string value that may contain HTML
  const out = [["lesson", t.lesson], ["mentalModel", t.mentalModel], ["exercise", t.exercise],
              ["solution", t.solution || ""], ["summary", t.summary]];
  (t.mistakes || []).forEach((m, i) => out.push([`mistakes[${i}]`, m]));
  (t.keyTerms || []).forEach((k, i) => out.push([`keyTerms[${i}].def`, k && k.def]));
  return out;
}

// Load files
const files = existsSync(CONTENT) ? readdirSync(CONTENT).filter(f => f.endsWith(".json")) : [];
const byId = {};
for (const f of files) {
  let obj;
  try { obj = JSON.parse(readFileSync(join(CONTENT, f), "utf8")); }
  catch (e) { errors.push(`${f}: invalid JSON — ${e.message}`); continue; }
  if (!obj.id) { errors.push(`${f}: missing id`); continue; }
  if (byId[obj.id]) errors.push(`${f}: duplicate id "${obj.id}"`);
  byId[obj.id] = obj;
}

// Validate against expected manifest
const topics = [];
for (const exp of expected) {
  const t = byId[exp.id];
  if (!t) { errors.push(`MISSING topic file for "${exp.id}" (${exp.title})`); continue; }
  for (const k of REQUIRED) {
    const v = t[k];
    const empty = v == null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && v.length === 0);
    if (empty) errors.push(`${exp.id}: field "${k}" is missing/empty`);
  }
  if (t.title !== exp.title)     warnings.push(`${exp.id}: title "${t.title}" != manifest "${exp.title}" (using manifest)`);
  if (t.section !== exp.section) warnings.push(`${exp.id}: section mismatch (using manifest)`);
  // force canonical identity from manifest
  t.id = exp.id; t.order = exp.order; t.section = exp.section; t.title = exp.title;

  const w = words(t.lesson);
  if (w < 650) warnings.push(`${exp.id}: lesson only ${w} words (target 700–900)`);
  if ((t.mistakes || []).length < 5) warnings.push(`${exp.id}: only ${(t.mistakes||[]).length} mistakes (target 5–6)`);
  if ((t.keyTerms || []).length < 6) warnings.push(`${exp.id}: only ${(t.keyTerms||[]).length} key terms (target 6+)`);
  if (!t.solution) warnings.push(`${exp.id}: no solution/hint provided`);

  for (const [field, val] of htmlFields(t)) {
    if (val == null) continue;
    for (const [re, label] of FORBIDDEN) {
      if (re.test(String(val))) errors.push(`${exp.id}: ${field} contains forbidden ${label}`);
    }
    // cross-links must be in-page anchors AND point to a real topic id
    const m = String(val).match(/href\s*=\s*["']([^"']*)["']/gi) || [];
    for (const h of m) {
      const target = (h.match(/href\s*=\s*["']([^"']*)["']/i) || [])[1] || "";
      if (!target.startsWith("#")) { errors.push(`${exp.id}: ${field} has non-anchor href: ${h}`); continue; }
      const tid = target.slice(1);
      if (tid && !VALID_IDS.has(tid)) errors.push(`${exp.id}: ${field} links to unknown topic id "#${tid}"`);
    }
  }
  topics.push(t);
}

// Extra files not in manifest?
for (const id of Object.keys(byId)) {
  if (!expected.find(e => e.id === id)) warnings.push(`content has unexpected topic "${id}" (not in manifest)`);
}

topics.sort((a, b) => a.order - b.order);

// Report
const RST = "\x1b[0m", R = "\x1b[31m", Y = "\x1b[33m", G = "\x1b[32m", B = "\x1b[1m";
console.log(`${B}Personal AI Course — build${RST}`);
console.log(`  topics found:    ${topics.length} / ${expected.length}`);
const wc = topics.map(t => words(t.lesson));
if (wc.length) console.log(`  lesson words:    min ${Math.min(...wc)} · avg ${Math.round(wc.reduce((a,c)=>a+c,0)/wc.length)} · max ${Math.max(...wc)}`);
if (warnings.length) { console.log(`\n${Y}Warnings (${warnings.length}):${RST}`); warnings.forEach(w => console.log(`  ${Y}•${RST} ${w}`)); }
if (errors.length)   { console.log(`\n${R}Errors (${errors.length}):${RST}`);   errors.forEach(e => console.log(`  ${R}✗${RST} ${e}`)); }

if (errors.length) { console.log(`\n${R}${B}Build FAILED — fix errors above.${RST}`); process.exit(1); }

// Assemble: inject JSON into the <script type=application/json> marker.
// Escape </ as <\/ so a stray "</script>" in content can't close the tag; JSON.parse restores it.
const template = readFileSync(join(ROOT, "template.html"), "utf8");
const payload = JSON.stringify(topics).replace(/<\//g, "<\\/");
if (!template.includes("/*__COURSE_DATA__*/")) { console.error("template.html missing /*__COURSE_DATA__*/ marker"); process.exit(1); }
const out = template.replace("/*__COURSE_DATA__*/", () => payload);

// Final offline guard on the assembled file (ignore our own first-party code)
const externalHit = /(?:src|href)\s*=\s*["']https?:|@import|url\(\s*["']?https?:/i.test(payload);
if (externalHit) { console.error(`${R}Assembled data still references external resources — aborting.${RST}`); process.exit(1); }

writeFileSync(join(ROOT, "index.html"), out);
const kb = (Buffer.byteLength(out) / 1024).toFixed(0);
console.log(`\n${G}${B}✓ Built index.html${RST} — ${topics.length} topics, ${kb} KB, 0 external loads.`);
