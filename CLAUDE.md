# textback-agent
Phase 1 prototype of a missed-call text-back agent for a residential tree service (Tri-Valley Tree Care, Livermore, CA). A web chat simulates the SMS conversation. The agent (Claude, claude-sonnet-5-5) captures a lead via tools, and completed chats are written to a Google Sheet through an Apps Script web app. Real SMS (Twilio) is Phase 2 and out of scope.

## Stack
- React + Vite + Tailwind v4 (src/)
- Vercel Node serverless functions, ESM (api/). Shared code in api/_lib/ (underscore files are not routes).
- No database, no auth. Conversation and lead state live in the browser and are sent each request.

## Source of truth
- prompts/agent-system-prompt-vN.md: agent system prompt, selected by env PROMPT_VERSION. Read at runtime; never inline prompt text in code.
- prompts/tools.json: tool schemas. prompts/opening-messages.json: fixed opening texts.
- evals/scenarios.json: eval scenarios. apps-script/Code.gs: the sheet web app (deployed manually).

## Rules
- Never use the em dash character anywhere: code, comments, UI copy, prompts, docs. Run npm run check:dashes before every commit.
- Secrets only in .env.local and Vercel env vars: ANTHROPIC_API_KEY, SHEET_WEBHOOK_URL, SHEET_TOKEN. Never log or commit them.
- Keep it minimal. No new dependencies without a stated reason. No features that will not appear in the demo.
- Demo data only: fake names, fake phone (555) 010-4477.

## Commands
- npm run dev:api  (vercel dev, serves front end and /api locally)
- npm run build
- npm run check:dashes
- npm run eval  (runs evals/scenarios.json against BASE_URL, default http://localhost:3000)
- vercel --prod  (deploy)

Files to create or change: package.json, vite.config.js, src/App.jsx, src/index.css, api/hello.js, vercel.json, scripts/check-dashes.mjs, .gitignore, CLAUDE.md.
