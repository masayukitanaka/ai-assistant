# Deployment Guide

## Environment Variables Setup for Cloudflare Workers

### Important Security Note

⚠️ **DO NOT commit `.env` files to Git or include them in deployment packages.**

The `.env` file is excluded from Git via `.gitignore`, but you need to configure environment variables separately for Cloudflare Workers using Secrets.

### Setting Up Secrets

Cloudflare Workers uses "Secrets" for sensitive environment variables like API keys. You need to set these up using the Wrangler CLI.

#### Method 1: Using Wrangler CLI (Recommended)

```bash
# Set Anthropic API Key
npx wrangler secret put ANTHROPIC_API_KEY

# Set Gemini API Key
npx wrangler secret put GEMINI_API_KEY

# Set OpenAI API Key
npx wrangler secret put OPENAI_API_KEY
```

When prompted, paste your API key and press Enter.

#### Method 2: Using Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to Workers & Pages
3. Select your worker: `ai-assistant`
4. Go to Settings → Variables
5. Under "Environment Variables", click "Add variable"
6. Add each secret:
   - Name: `ANTHROPIC_API_KEY`, Value: `your-anthropic-key`, Type: **Encrypt**
   - Name: `GEMINI_API_KEY`, Value: `your-gemini-key`, Type: **Encrypt**
   - Name: `OPENAI_API_KEY`, Value: `your-openai-key`, Type: **Encrypt**

### Deployment

Once secrets are configured:

```bash
npm run deploy
```

### Local Development

For local development, use `.dev.vars` file (already in `.gitignore`):

```bash
# Copy example file
cp .env.example .dev.vars

# Edit .dev.vars with your API keys
# This file is used by `wrangler dev` and `npm run dev`
```

### Verification

After deployment, test your worker:

```bash
curl https://ai-assistant.ursytsr.workers.dev
```

If environment variables are not set, you'll see errors when trying to use the AI providers.

### Getting API Keys

- **Anthropic Claude**: https://console.anthropic.com/
- **Google Gemini**: https://aistudio.google.com/app/apikey
- **OpenAI**: https://platform.openai.com/api-keys
