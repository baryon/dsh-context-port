# dsh-context Otoha port

This is an independently modified, unpublished port. It is not an upstream release or an endorsement by the original author.

- Source: https://github.com/bowenliang123/dsh-context
- Author: bowenliang123
- Version: 0.74.0
- Pinned commit: `2bde34d76679d5c748985431cc6d021f04334616`
- License: Apache-2.0; the complete upstream LICENSE is retained beside this file. No upstream NOTICE file exists at that commit.
- Port changes: 2026-10-23, Otoha port contributors. No remote fork or push has been performed.

The files `src/vendor/components/{donut,stackedBar,currentComposition}.tsx`, `src/vendor/format.ts`, and `src/vendor/stackedBar.css` are copied from the matching upstream `src/client/` paths. The only change in these copied files is a documented lint annotation on the upstream layout measurement effect; runtime logic is unchanged. The small companion structural type files are port-specific substitutes; they do not import the DeepSeek runtime. `src/contextView.tsx` replaces the original `makeContextView` composition with the supported read-only card subset and keeps the original composition-card factories and shared-hover donut presentation. It does not claim to reuse the entire upstream ContextView module.

Cordis services, projections, Slots, module-loader externals, settings, and session selection are replaced by an independent self-contained MCP App, a standard resource adapter, and a bounded snapshot feed. The server serves UI only; it cannot read host statistics. No DeepSeek default compaction threshold, tokenizer, price table, provider anchoring, or prompt editing behavior is carried over. Unknown data stays unknown.

The isolated browser bundle includes its own React/React DOM and the official MCP Apps SDK. Their licenses, and the licenses of all discovered bundled dependency packages, are emitted to `dist/THIRD_PARTY_NOTICES.txt` by the build and copied into the installable artifact. They are not covered merely by the dsh-context top-level license.
