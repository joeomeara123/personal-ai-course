# 🧠 Personal AI Course — LLM Engineering & Fine-Tuning

A **self-contained, offline, interactive course** that teaches modern LLM engineering and
fine-tuning from **absolute beginner to advanced**, in plain everyday English.

**84 topics across 11 sections.** Every topic has a **lesson** (with daily-life analogies,
worked examples, and code snippets), a **mental model**, **common mistakes to avoid**, a
hands-on **exercise** (with a reveal-able hint), a **summary**, and a **key-terms glossary**.

## ✨ How to use it

1. **Download `index.html`** (or clone this repo).
2. **Double-click it** — it opens in any browser. No install, no server, no internet needed.
3. Click a topic, read, do the exercise, hit **“Mark complete.”**
4. Close the tab whenever. Come back days later — your progress, last topic, and theme are
   **saved automatically** in the browser and you pick up exactly where you left off.

> Progress is stored per-browser via `localStorage`. Switching machines/browsers? Use the
> **Export progress** / **Import** buttons in the sidebar to carry your checkmarks across.

### Features
- ✅ Progress bar + per-section completion counts, mark-complete toggles
- 🎉 Delightful GSAP animations: staggered lesson reveal, animated count-up progress bar, a confetti burst when you complete a topic, a toast when you finish a section, and a full celebration when you finish all 84
- 💾 Auto-save & resume (last topic, completed topics, collapsed sections, theme)
- 🔎 Instant topic search · ⌨️ arrow-key navigation (← / →)
- 🌙 Light / dark theme · 📱 works on phone & desktop
- ♿ Respects `prefers-reduced-motion` (animations gracefully turn off)
- 🔌 100% offline — zero external requests, zero dependencies (GSAP is bundled *inline*, not from a CDN)

## 📚 What's covered

Foundations · Datasets & Training · Fine-Tuning · Inference & Optimization ·
Local AI Ecosystem · RAG & Memory · Agents & Workflows · Model Types · Deployment ·
Evaluation · Real-World Skills.

From *tokens, embeddings, transformers, and attention* → *LoRA / QLoRA, DPO, RLHF,
quantization, GGUF* → *KV cache, Flash Attention, speculative decoding, vLLM, Ollama,
llama.cpp, MLX, Unsloth, Axolotl* → *RAG, vector DBs, agents, tool calling, MoE & reasoning
models* → *building chatbots, copilots, and AI products.*

## 🛠️ Project layout / regenerating the course

The single `index.html` is **built** from small source pieces, so the content is easy to edit
and regenerate:

```
topics.json       # canonical list of all 84 topics (id, order, section, title)
SPEC.md           # the content contract every topic follows
content/*.json    # one file per topic — the actual lessons (the "source of truth")
template.html     # the app shell: all HTML/CSS/JS + animations (offline), with injection markers
vendor/gsap.min.js# vendored GSAP (MIT-friendly) — inlined into index.html at build time, no CDN
build.mjs         # validates content, inlines GSAP + content into the shell -> index.html
verify-build.mjs  # sanity-checks the assembled index.html the way the browser loads it
index.html        # ← the built, shippable, single-file course
```

To rebuild after editing any `content/*.json` or the template:

```bash
bun build.mjs
```

The build **fails loudly** if any topic is missing a field or if anything would break the
offline guarantee (external `src`/`href`, `<script>`, `<img>`, `@import`, etc.).

## License

MIT — see [LICENSE](LICENSE). Learn freely. 🚀
