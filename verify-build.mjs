#!/usr/bin/env bun
// Verifies the BUILT index.html the same way the browser does at boot:
// pull the embedded JSON out of the <script type=application/json> tag and JSON.parse it.
import { readFileSync } from "node:fs";
const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");

let fail = 0;
const ok = (c, m) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) fail++; };

// 1) marker replaced
ok(!html.includes("/*__COURSE_DATA__*/"), "data marker was replaced");

// 2) extract + parse embedded data (mirrors document.getElementById('course-data').textContent)
const m = html.match(/<script id="course-data" type="application\/json">([\s\S]*?)<\/script>/);
ok(!!m, "found <script id=course-data> block");
let data = [];
try { data = JSON.parse(m[1]); ok(true, "embedded JSON.parse succeeds (escaping round-trips)"); }
catch (e) { ok(false, "embedded JSON.parse FAILED: " + e.message); }

// 3) shape
ok(Array.isArray(data) && data.length === 84, `84 topics embedded (got ${data.length})`);
const ids = new Set(data.map(t => t.id));
ok(ids.size === 84, `84 unique ids (got ${ids.size})`);

const need = ["id","order","section","title","lesson","mentalModel","mistakes","exercise","summary","keyTerms"];
let missing = 0, xrefBroken = 0, xrefTotal = 0;
for (const t of data) {
  for (const k of need) {
    const v = t[k];
    if (v == null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && !v.length)) missing++;
  }
  const links = (t.lesson.match(/href="#([^"]+)"/g) || []).map(s => s.slice(7, -1));
  for (const l of links) { xrefTotal++; if (!ids.has(l)) xrefBroken++; }
}
ok(missing === 0, `every topic has all ${need.length} fields (missing slots: ${missing})`);
ok(xrefBroken === 0, `all ${xrefTotal} cross-links resolve to real topics (broken: ${xrefBroken})`);

// v2 fields: takeaways / diagram / quiz across all topics, + forbidden-content scan of parsed data
let taBad = 0, dgBad = 0, qzBad = 0, qAnsBad = 0, fbHits = 0, quizTotal = 0;
const FB = [/<script\b/i, /<style\b/i, /<iframe\b/i, /<image\b/i, /<img\b/i, /(?:src|href)\s*=\s*["']https?:/i, /@import/i, /url\(\s*["']?https?:/i];
const scan = (s) => { if (s == null) return; const v = String(s); for (const re of FB) if (re.test(v)) fbHits++; };
for (const t of data) {
  if (!Array.isArray(t.takeaways) || t.takeaways.length !== 3) taBad++;
  if (!t.diagram || !/^\s*<svg[\s>]/i.test((t.diagram && t.diagram.svg) || "")) dgBad++;
  if (!Array.isArray(t.quiz) || t.quiz.length !== 4) qzBad++;
  else t.quiz.forEach((q) => { quizTotal++; if (!q || !Array.isArray(q.options) || typeof q.answer !== "number" || q.answer < 0 || q.answer >= q.options.length) qAnsBad++; });
  (t.takeaways || []).forEach(scan); scan(t.diagram && t.diagram.svg); scan(t.diagram && t.diagram.caption); scan(t.lesson); scan(t.exercise); scan(t.solution);
  (t.mistakes || []).forEach(scan); (t.keyTerms || []).forEach((k) => scan(k && k.def));
  (t.quiz || []).forEach((q) => { scan(q && q.q); scan(q && q.explain); (q && q.options || []).forEach(scan); });
}
ok(taBad === 0, `every topic has exactly 3 takeaways (bad: ${taBad})`);
ok(dgBad === 0, `every topic has an inline <svg> diagram (bad: ${dgBad})`);
ok(qzBad === 0, `every topic has a 4-question quiz (bad: ${qzBad})`);
ok(qAnsBad === 0, `all ${quizTotal} quiz questions have a valid answer index (bad: ${qAnsBad})`);
ok(fbHits === 0, `no forbidden/external content anywhere in topic data (hits: ${fbHits})`);

// 4) offline guarantee on the WHOLE file (ignore in-page #anchors)
const externals = html.match(/(?:src|href)\s*=\s*["']https?:\/\/[^"']+/gi) || [];
ok(externals.length === 0, `no external src/href URLs (found ${externals.length})`);
ok(!/@import|url\(\s*["']?https?:/i.test(html), "no @import / url(http…)");
// only one <script> with src? there should be ZERO external scripts
const extScripts = html.match(/<script[^>]*\bsrc=/gi) || [];
ok(extScripts.length === 0, `no external <script src> (found ${extScripts.length})`);

// 5) sections
const sections = [...new Set(data.map(t => t.section))];
ok(sections.length === 11, `11 sections (got ${sections.length}): ${sections.join(" · ")}`);

console.log(`\n${fail === 0 ? "ALL CHECKS PASSED ✅" : fail + " CHECK(S) FAILED ❌"}`);
process.exit(fail ? 1 : 0);
