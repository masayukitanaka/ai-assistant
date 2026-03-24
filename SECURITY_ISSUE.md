# CRITICAL SECURITY ISSUE FOUND

## Problem

APIキーが`.env`ファイルからビルド時にバンドルに埋め込まれ、Cloudflare Workersにデプロイされています。

## Evidence

1. Cloudflare Workersに環境変数（Secrets）を設定していない
2. しかし、デプロイされたアプリケーションがAI APIを正常に呼び出せている
3. Next.jsは`.env`ファイルを自動的に読み込む
4. Turbopack/Webpackがビルド時に`process.env.*`の参照を実際の値で置き換えている

## Impact

- ✅ **APIキーがJavaScriptバンドルに平文で埋め込まれている**
- ⚠️ **デプロイされたコードからAPIキーが抽出可能**
- ⚠️ **誰でもあなたのAPIキーを使用できる状態**

## Immediate Actions Required

### 1. APIキーを即座にローテーション（再発行）

以下のサービスで新しいAPIキーを発行し、古いキーを無効化してください：

- **Anthropic**: https://console.anthropic.com/settings/keys
- **Google Gemini**: https://aistudio.google.com/app/apikey
- **OpenAI**: https://platform.openai.com/api-keys

### 2. `.env`ファイルを削除

ローカル開発用の`.env`ファイルを削除し、代わりに`.dev.vars`を使用：

```bash
# .envファイルを削除
rm .env

# .dev.varsに移行（Wrangler専用）
mv .env .dev.vars
```

### 3. Cloudflare Secretsを設定

```bash
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put OPENAI_API_KEY
```

### 4. 再デプロイ

Secretsを設定後、再度デプロイ：

```bash
npm run deploy
```

## Root Cause

Next.jsは以下の環境変数ファイルを自動的に読み込みます：
- `.env`
- `.env.local`
- `.env.production`
- `.env.development`

Turbopackビルド時に、サーバーサイドコードの`process.env.*`参照が実際の値で置き換えられ、バンドルに埋め込まれます。

## Prevention

今後このような問題を防ぐために：

1. **`.env`ファイルを使用しない** - Cloudflare Workers環境では`.dev.vars`のみ使用
2. **Cloudflare Secretsを使用** - 本番環境の秘密情報は必ずSecretsで管理
3. **環境変数のプレフィックスに注意** - `NEXT_PUBLIC_*`で始まる環境変数はクライアントサイドに埋め込まれる（使用しない）

## Status

- [x] 問題を特定
- [ ] APIキーをローテーション
- [ ] `.env`を削除し`.dev.vars`に移行
- [ ] Cloudflare Secretsを設定
- [ ] 再デプロイ
- [ ] 動作確認
