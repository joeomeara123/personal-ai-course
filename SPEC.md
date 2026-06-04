# Content Spec — Personal AI Course (READ FULLY BEFORE WRITING)

You are an expert AI engineer **and a patient teacher**. You are writing ONE topic of a
self-contained, beginner→advanced course on modern LLM engineering & fine-tuning.

Audience: **smart but new** to AI. They are not academics. Teach like a mentor sitting next
to them. Your single job: produce one JSON file for your assigned topic, following this spec
**exactly**, then write it to disk.

## Voice & teaching rules (NON-NEGOTIABLE)

- **Plain English only.** Short sentences. No academic tone.
- **Explain every hard word the moment you use it**, in plain language. If you write a term
  like "gradient" or "logits", immediately gloss it: e.g. "logits (the raw scores the model
  gives each possible next word)".
- **Use daily-life analogies.** Compare AI ideas to cooking, libraries, water pipes, LEGO,
  hiring, GPS, etc. Use **at least two distinct analogies** in the lesson (depth level: deep-dive).
- **Real-world use cases.** Show where this actually matters in building real products.
- **Compare side-by-side** when two ideas are easily confused (use the comparison table).
- **Teach fundamentals first, then the nuance.** Build the idea up; don't dump jargon.
- Be **accurate and current** (knowledge through 2026). Don't invent fake numbers; if you give
  a figure, make it a reasonable real-world ballpark and say "roughly".

## Depth target: DEEP-DIVE

- `lesson`: **700–900 words** of HTML. Multiple analogies, at least one worked example, and
  **1–2 small code snippets** where code genuinely helps (some conceptual topics may use 1).
- `mistakes`: **5–6** items.
- `keyTerms`: **6 or more** items.
- `exercise`: a concrete small task **plus a "Stretch goal:"** line.

## Output: write a JSON file

Write your file to: `/Users/joe/code/personal-ai-course/content/<order>-<id>.json`
(e.g. `content/03-tokens.json`). `order` is zero-padded to 2 digits.

The JSON object must have EXACTLY these keys:

```json
{
  "id": "<assigned id, unchanged>",
  "order": <assigned integer>,
  "section": "<assigned section, unchanged>",
  "title": "<assigned title, unchanged>",
  "lesson": "<HTML fragment, 700-900 words>",
  "mentalModel": "<HTML/text: 1–3 sentences. One vivid picture to hold in your head>",
  "mistakes": ["<HTML/text item>", "... 5–6 total"],
  "exercise": "<HTML: a small hands-on exercise/mini-project. End with '<strong>Stretch goal:</strong> ...'>",
  "solution": "<HTML: a short hint or worked answer; shown behind a reveal toggle>",
  "summary": "<HTML/text: 2–4 line recap of the essentials>",
  "keyTerms": [ { "term": "<word>", "def": "<plain-English definition>" }, "... 6+ total" ]
}
```

Do not add or rename keys. `id`, `order`, `section`, `title` must match your assignment verbatim.

## HTML rules for `lesson` (and any HTML field)

Output an **HTML fragment** (no `<html>`, `<head>`, `<body>`). Only these tags are allowed:

- `<p>` paragraphs, `<h4>` sub-headings inside the lesson, `<strong>`, `<em>`
- `<ul><li>` and `<ol><li>` lists
- Inline code: `<code>like_this()</code>`
- Code blocks: `<pre><code class="lang-python">...</code></pre>` (also `lang-bash`, `lang-json`, `lang-text`). Keep snippets short (≤ ~15 lines) and realistic.
- Comparison table: `<table class="cmp"><thead><tr><th>..</th><th>..</th></tr></thead><tbody><tr><td>..</td><td>..</td></tr></tbody></table>`
- Callouts (optional): `<p class="callout tip">💡 ...</p>` or `<p class="callout warn">⚠️ ...</p>`
- **Cross-links to other topics**: `<a class="xref" href="#<other-topic-id>">Topic Title</a>`.
  Use these to connect ideas (e.g. from QLoRA link to `#lora` and `#quantization`). Only link to ids that exist (list provided in your task).

**FORBIDDEN** (these break the offline single-file guarantee — never output them):
- No `<script>`, no `<style>`, no `<iframe>`, no `<link>`.
- No external resources: no `<img>`, no `href="http..."`, no `src="http..."`, no `@import`, no web-font URLs.
- The ONLY allowed `href` value is an in-page anchor starting with `#`.
- Do not escape your HTML as text — output real tags. But inside `<code>`/`<pre>`, escape `<`, `>`, `&` as `&lt;` `&gt;` `&amp;` so they render.

## JSON validity (CRITICAL)

- The file must be **strictly valid JSON** (it will be parsed by `JSON.parse`).
- All strings are double-quoted. Escape any `"` inside HTML attributes as `\"`.
- **Prefer single quotes inside HTML** (e.g. `<code class='lang-python'>`)? NO — class attributes use double quotes in the examples, so escape them: `<pre><code class=\"lang-python\">`. To avoid pain, you MAY use class names without quotes is invalid HTML — instead, escape the double quotes. Simplest safe path: write attributes as `class=\"cmp\"` inside the JSON string.
- No trailing commas. No comments. No markdown fences around the JSON.

## Quality bar (your file will be auto-checked and may be rejected)

A reviewer will re-read your file and FIX it if: lesson < 650 words, fewer than 2 analogies,
unexplained jargon, missing keys, invalid JSON, forbidden tags, or boring/generic writing.
Aim to pass first time: vivid, concrete, genuinely clarifying.

---

# v2 — "Guided steps" upgrade (ADDITIONAL required fields)

The course now shows each topic as a clickable stepper: ① In a nutshell ② Lesson ③ Visual
④ Practice ⑤ Quiz — one small panel at a time. Add THREE new keys to the JSON (keep all the
existing keys too). Also gently improve readability of `lesson` (see below).

### New key: `takeaways`  — array of EXACTLY 3 short strings
Punchy, skimmable, ≤ ~14 words each. The gist of the topic so a reader "gets it" in 10 seconds.
Plain text or tiny inline HTML (`<strong>`, `<code>`). Example:
`["A token is a sub-word chunk, not a whole word.", "You pay per token — input and output.", "1 token ≈ ¾ of a word."]`

### New key: `diagram` — an object `{ "svg": "<inline SVG>", "caption": "one sentence" }`
A clean, labelled **inline SVG** that visualizes the core idea (a flow, a comparison, a structure).
- Root element: `<svg class="dg" viewBox="0 0 720 340" role="img" aria-label="...">`. Use that viewBox so it scales nicely. ~4–8 labelled nodes max. Keep it uncluttered.
- **Do NOT hardcode colors.** Style everything with these provided classes ONLY (they adapt to light/dark):
  - Boxes: `dg-box` (neutral), `dg-box-accent`, `dg-box-2`, `dg-box-good`, `dg-box-warn`
  - Text: `dg-title` (heading), `dg-label` (node label), `dg-sub` (smaller), `dg-note` (muted caption)
  - Connectors: `dg-edge` (line/path; gets an animated "draw-on"); arrowheads via the `arrow` marker below
- Allowed SVG tags ONLY: `svg, defs, marker, g, rect, circle, ellipse, line, path, polyline, polygon, text, tspan, title`. NO `<image>`, NO `href`/`xlink:href`, NO external refs, NO `<style>`/`<script>`.
- Always center labels with `text-anchor="middle"`. Give rects `rx="12"`.
- Caption: one plain sentence telling the learner what the picture shows.

**Copy this skeleton and adapt it** (a 3-stage pipeline). Keep the `<defs>` marker exactly:
```
<svg class=\"dg\" viewBox=\"0 0 720 340\" role=\"img\" aria-label=\"How tokens flow into a model\">
  <defs><marker id=\"arrow\" markerWidth=\"12\" markerHeight=\"12\" refX=\"9\" refY=\"5\" orient=\"auto\"><path class=\"dg-arrowhead\" d=\"M0,0 L11,5 L0,10 z\"/></marker></defs>
  <text class=\"dg-title\" x=\"360\" y=\"40\" text-anchor=\"middle\">From text to prediction</text>
  <line class=\"dg-edge\" x1=\"200\" y1=\"170\" x2=\"280\" y2=\"170\" marker-end=\"url(#arrow)\"/>
  <line class=\"dg-edge\" x1=\"440\" y1=\"170\" x2=\"520\" y2=\"170\" marker-end=\"url(#arrow)\"/>
  <rect class=\"dg-box\" x=\"60\" y=\"140\" width=\"140\" height=\"60\" rx=\"12\"/>
  <text class=\"dg-label\" x=\"130\" y=\"175\" text-anchor=\"middle\">\\\"I love AI\\\"</text>
  <rect class=\"dg-box dg-box-accent\" x=\"280\" y=\"140\" width=\"160\" height=\"60\" rx=\"12\"/>
  <text class=\"dg-label\" x=\"360\" y=\"168\" text-anchor=\"middle\">Tokens</text>
  <text class=\"dg-sub\" x=\"360\" y=\"188\" text-anchor=\"middle\">[40, 1842, 9303]</text>
  <rect class=\"dg-box dg-box-good\" x=\"520\" y=\"140\" width=\"140\" height=\"60\" rx=\"12\"/>
  <text class=\"dg-label\" x=\"590\" y=\"175\" text-anchor=\"middle\">Next token</text>
</svg>
```
Make YOUR diagram specific to YOUR topic (not this token example). Use boxes + arrows, or a
comparison (two columns), or a simple stack/hierarchy — whatever best explains the concept.

### New key: `quiz` — array of EXACTLY 4 multiple-choice questions
Each item: `{ "q": "question?", "options": ["...","...","...","..."], "answer": <0-3 index of correct>, "explain": "1–2 sentence why" }`.
- Exactly 4 options per question. `answer` is the 0-based index of the correct option.
- Test real understanding (apply the idea), not trivia. Mix easy → harder. Make wrong options plausible.
- Keep `explain` short and teach why the right answer is right (and ideally why a tempting wrong one is wrong).

### Improve `lesson` readability (rework, don't lengthen)
Keep it 700–900 words but make it **less of a wall of text**: short paragraphs (2–4 sentences),
use `<h4>` sub-headings to break sections, and prefer `<ul><li>` bullets for lists of points.
Keep the analogies and the code. The goal is "scannable and friendly", not "denser".

### When EDITING an existing file
Read the current JSON, KEEP all existing good content (don't drop fields), keep id/order/section/title
verbatim, ADD `takeaways`, `diagram`, `quiz`, and lightly re-flow `lesson` for readability. Output the
full, valid JSON with ALL keys (old + new).
