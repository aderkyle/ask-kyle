# Ask Kyle

A chat page that answers the way Kyle thinks — business, scenarios, coaching and Organization Development, and captions/scripts. No personal details are in the prompt; it only carries principles, voice, and vocabulary.

## What's inside
- `public/index.html` — the chat page
- `netlify/functions/ask.mjs` — server function that calls Claude (keeps the API key off the browser)
- `netlify/functions/kyle-prompt.mjs` — the "how Kyle thinks" profile. Edit this to tune the voice.

## Deploy (about 5 minutes)

Netlify's drag-and-drop does not run server functions, so use one of these:

**Option A — GitHub (easiest to keep updating)**
1. Create a new GitHub repo and upload the contents of this folder.
2. In Netlify: Add new site → Import an existing project → pick the repo. Leave build settings as-is (they come from `netlify.toml`).
3. Site configuration → Environment variables → add `ANTHROPIC_API_KEY` (from console.anthropic.com).
4. Deploys → Trigger deploy.

**Option B — Netlify CLI**
```
npm i -g netlify-cli
cd ask-kyle
netlify login
netlify init
netlify env:set ANTHROPIC_API_KEY sk-ant-...
netlify deploy --prod
```

## Optional
- `ANTHROPIC_MODEL` env var to change the model (default `claude-sonnet-5-5`).
- Set a monthly spend limit in the Anthropic Console — the page is public, so anyone with the link uses your API credits.
