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
  [/<image\b/i, "<image> tag (external SVG asset)"],
  [/\bsrc\s*=\s*["']https?:/i, "external src= URL"],
  [/\bhref\s*=\s*["']https?:/i, "external href= URL"],
  [/@import/i, "@import"],
  [/url\(\s*["']?https?:/i, "url(http…) reference"],
];

const errors = [];
const warnings = [];

const LEVELS = ["learn", "build", "ship"];
let path = null;
try { path = JSON.parse(readFileSync(join(ROOT, "path.json"), "utf8")); }
catch (e) { errors.push(`path.json: ${existsSync(join(ROOT, "path.json")) ? "invalid JSON — " + e.message : "missing"}`); }

function words(html) {
  return String(html).replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").trim().split(/\s+/).filter(Boolean).length;
}
function htmlFields(t) {
  // every string value that may contain HTML / SVG
  const out = [["lesson", t.lesson], ["mentalModel", t.mentalModel], ["exercise", t.exercise],
              ["solution", t.solution || ""], ["summary", t.summary]];
  (t.mistakes || []).forEach((m, i) => out.push([`mistakes[${i}]`, m]));
  (t.keyTerms || []).forEach((k, i) => out.push([`keyTerms[${i}].def`, k && k.def]));
  (t.takeaways || []).forEach((m, i) => out.push([`takeaways[${i}]`, m]));
  if (t.diagram) { out.push(["diagram.svg", t.diagram.svg]); out.push(["diagram.caption", t.diagram.caption]); }
  (t.quiz || []).forEach((q, i) => {
    out.push([`quiz[${i}].q`, q && q.q]); out.push([`quiz[${i}].explain`, q && q.explain]);
    (q && q.options || []).forEach((o, j) => out.push([`quiz[${i}].options[${j}]`, o]));
  });
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
  // path metadata (level + pathOrder) — carried into the embedded data
  if (!LEVELS.includes(exp.level)) errors.push(`${exp.id}: level must be one of ${LEVELS.join("/")} (got ${JSON.stringify(exp.level)})`);
  if (typeof exp.pathOrder !== "number") errors.push(`${exp.id}: pathOrder must be a number`);
  t.level = exp.level; t.pathOrder = exp.pathOrder;

  const w = words(t.lesson);
  if (w < 650) warnings.push(`${exp.id}: lesson only ${w} words (target 700–900)`);
  if ((t.mistakes || []).length < 5) warnings.push(`${exp.id}: only ${(t.mistakes||[]).length} mistakes (target 5–6)`);
  if ((t.keyTerms || []).length < 6) warnings.push(`${exp.id}: only ${(t.keyTerms||[]).length} key terms (target 6+)`);
  if (!t.solution) warnings.push(`${exp.id}: no solution/hint provided`);

  // v2 fields: warn if absent (transition), but malformed quiz answers are hard errors
  if (!Array.isArray(t.takeaways) || t.takeaways.length !== 3) warnings.push(`${exp.id}: takeaways should be exactly 3 (got ${(t.takeaways || []).length})`);
  if (!t.diagram || !t.diagram.svg) warnings.push(`${exp.id}: no diagram.svg`);
  else if (!/^\s*<svg[\s>]/i.test(t.diagram.svg)) errors.push(`${exp.id}: diagram.svg does not start with <svg>`);
  if (!Array.isArray(t.quiz) || t.quiz.length === 0) warnings.push(`${exp.id}: no quiz`);
  else {
    if (t.quiz.length !== 4) warnings.push(`${exp.id}: quiz should have 4 questions (got ${t.quiz.length})`);
    t.quiz.forEach((q, i) => {
      if (!q || !q.q || !Array.isArray(q.options) || q.options.length < 2) { errors.push(`${exp.id}: quiz[${i}] malformed (need q + >=2 options)`); return; }
      if (typeof q.answer !== "number" || q.answer < 0 || q.answer >= q.options.length) errors.push(`${exp.id}: quiz[${i}].answer ${q.answer} out of range (0..${q.options.length - 1})`);
      if (!q.explain) warnings.push(`${exp.id}: quiz[${i}] has no explanation`);
    });
  }

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

// Level coverage: every topic mapped to a level; warn on duplicate pathOrder within a level
LEVELS.forEach(lv => {
  const inLv = expected.filter(e => e.level === lv);
  if (!inLv.length) errors.push(`no topics mapped to level "${lv}"`);
  const seen = {};
  inLv.forEach(e => { if (seen[e.pathOrder]) warnings.push(`level "${lv}": duplicate pathOrder ${e.pathOrder} (${seen[e.pathOrder]} & ${e.id})`); seen[e.pathOrder] = e.id; });
});

// Validate path.json (levels, resources, capstones, drawsOn, offline-safety of capstone HTML)
if (path) {
  if (!Array.isArray(path.levels) || path.levels.length !== 3) errors.push(`path.json: expected 3 levels (got ${(path.levels || []).length})`);
  (path.levels || []).forEach((lv, i) => {
    if (!LEVELS.includes(lv.id)) errors.push(`path.json level[${i}]: id must be learn/build/ship (got ${JSON.stringify(lv.id)})`);
    if (!lv.title) errors.push(`path.json level "${lv.id}": missing title`);
    (lv.resources || []).forEach((r, j) => { if (!r || !r.title || !r.url) errors.push(`path.json level "${lv.id}" resource[${j}]: needs title + url`); });
    const c = lv.capstone;
    if (!c) { errors.push(`path.json level "${lv.id}": missing capstone`); return; }
    if (!c.title || !c.goal) errors.push(`path.json "${lv.id}" capstone: needs title + goal`);
    if (!Array.isArray(c.steps) || !c.steps.length) errors.push(`path.json "${lv.id}" capstone: needs steps[]`);
    if (!Array.isArray(c.definitionOfDone) || !c.definitionOfDone.length) errors.push(`path.json "${lv.id}" capstone: needs definitionOfDone[]`);
    (c.drawsOn || []).forEach(id => { if (!VALID_IDS.has(id)) errors.push(`path.json "${lv.id}" capstone drawsOn unknown topic "${id}"`); });
    // offline scan of capstone HTML-bearing fields (NOT resources[].url, which are legitimately https)
    const htmlVals = [["goal", c.goal], ["why", c.why || ""]];
    (c.steps || []).forEach((s, k) => htmlVals.push([`steps[${k}]`, s]));
    (c.definitionOfDone || []).forEach((s, k) => htmlVals.push([`definitionOfDone[${k}]`, s]));
    for (const [field, val] of htmlVals) {
      for (const [re, label] of FORBIDDEN) if (re.test(String(val))) errors.push(`path.json "${lv.id}" capstone ${field}: forbidden ${label}`);
      const hm = String(val).match(/href\s*=\s*["']([^"']*)["']/gi) || [];
      for (const h of hm) { const tgt = (h.match(/href\s*=\s*["']([^"']*)["']/i) || [])[1] || ""; if (!tgt.startsWith("#") || !VALID_IDS.has(tgt.slice(1))) errors.push(`path.json "${lv.id}" capstone ${field}: bad href ${h}`); }
    }
  });
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

// Assemble.
let template = readFileSync(join(ROOT, "template.html"), "utf8");

// 1) Inline vendored GSAP (keeps the single-file/offline guarantee — no CDN).
if (!template.includes("/*__GSAP__*/")) { console.error("template.html missing /*__GSAP__*/ marker"); process.exit(1); }
const gsapPath = join(ROOT, "vendor", "gsap.min.js");
if (!existsSync(gsapPath)) { console.error("vendor/gsap.min.js missing — run: curl -sL https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js -o vendor/gsap.min.js"); process.exit(1); }
const gsap = readFileSync(gsapPath, "utf8");
if (/<\/script/i.test(gsap)) { console.error("vendor/gsap.min.js contains </script — cannot inline safely"); process.exit(1); }
if (/\bsrc\s*=\s*["']https?:|@import|url\(\s*["']?https?:/i.test(gsap)) { console.error("vendor/gsap.min.js references an external resource — aborting"); process.exit(1); }
template = template.replace("/*__GSAP__*/", () => gsap);

// 2) Inject JSON into the <script type=application/json> marker.
// Escape </ as <\/ so a stray "</script>" in content can't close the tag; JSON.parse restores it.
const payload = JSON.stringify(topics).replace(/<\//g, "<\\/");
if (!template.includes("/*__COURSE_DATA__*/")) { console.error("template.html missing /*__COURSE_DATA__*/ marker"); process.exit(1); }
template = template.replace("/*__COURSE_DATA__*/", () => payload);

// 3) Inject path / roadmap data into its marker.
const pathPayload = JSON.stringify(path || {}).replace(/<\//g, "<\\/");
if (!template.includes("/*__PATH_DATA__*/")) { console.error("template.html missing /*__PATH_DATA__*/ marker"); process.exit(1); }
template = template.replace("/*__PATH_DATA__*/", () => pathPayload);
const out = template;

// Final offline guard on the assembled data (resource urls live in "url" values, never in href=/src=)
const externalHit = [payload, pathPayload].some(p => /(?:src|href)\s*=\s*["']https?:|@import|url\(\s*["']?https?:/i.test(p));
if (externalHit) { console.error(`${R}Assembled data still references external resources — aborting.${RST}`); process.exit(1); }

writeFileSync(join(ROOT, "index.html"), out);
const kb = (Buffer.byteLength(out) / 1024).toFixed(0);
console.log(`\n${G}${B}✓ Built index.html${RST} — ${topics.length} topics, ${kb} KB, 0 external loads.`);
