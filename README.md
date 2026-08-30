# Steam Wishlist Tracker

Discordの特定チャンネルに貼られたSteamストアURLを自動収集し、価格・セール状況・レビュー評価つきの一覧をGitHub Pagesで公開するツール。

- **データ収集**: Discord BotのREST APIでチャンネルの投稿履歴をポーリングし、`store.steampowered.com/app/<id>` のURLを抽出（常時起動プロセス不要）
- **ゲーム情報取得**: SteamのAppDetails API / Review API から価格・割引率・レビュー概要（好評/やや好評など）を取得
- **公開**: GitHub Actionsが毎日自動でデータ取得→ビルド→GitHub Pagesへデプロイ
- **フロント**: React (Vite)。割引率順・評価順・価格順・名前順のソート、セール中のみ表示のフィルタに対応

## ローカル開発

```bash
npm install
npm run dev
```

`src/data/games.json` に入っているサンプルデータ（ELDEN RING等）でそのまま表示確認できます。

## データの再取得（ローカル）

`.env` を作成し、以下を設定:

```
DISCORD_BOT_TOKEN=xxxx
DISCORD_CHANNEL_ID=1523002540302667879
DISCORD_GUILD_ID=1219991260580941824   # 省略可（メッセージリンク生成にのみ使用）
```

```bash
npm run fetch-data   # src/data/games.json を更新
npm run dev
```

## Discord Botのセットアップ

1. [Discord Developer Portal](https://discord.com/developers/applications) で **New Application** を作成
2. 左メニュー **Bot** → **Add Bot**
   - **Privileged Gateway Intents** の **Message Content Intent** をON（投稿本文を読み取るために必要）
   - **Reset Token** でトークンを発行し、控えておく（GitHub Secretsに使用）
3. 左メニュー **OAuth2 → URL Generator**
   - **SCOPES**: `bot`
   - **BOT PERMISSIONS**: `View Channels`, `Read Message History`
   - 生成されたURLをブラウザで開き、対象のDiscordサーバーにBotを招待（サーバーの管理権限が必要）
4. Discordの `ユーザー設定 → 詳細設定 → 開発者モード` をON
5. 対象チャンネルを右クリック → **チャンネルIDをコピー** → `DISCORD_CHANNEL_ID` に使用

## GitHub側のセットアップ

1. このプロジェクトをGitHubの新規リポジトリ（例: `steam-wishlist-tracker`）にpush
2. リポジトリの **Settings → Secrets and variables → Actions** で以下を登録
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_CHANNEL_ID`
   - `DISCORD_GUILD_ID`（任意。メッセージへのリンク生成に使用。省略時はリンクが `@me` 基準になる）
3. **Settings → Pages** の **Source** を **GitHub Actions** に設定
4. `main` へのpush、または毎日15:05 UTC(00:05 JST)の定期実行で自動的に
   データ取得 → ビルド → デプロイが走る（`.github/workflows/deploy.yml`）
5. 手動実行したい場合は **Actions → Fetch data & deploy to GitHub Pages → Run workflow**

リポジトリ名を `steam-wishlist-tracker` から変更する場合は、[vite.config.js](vite.config.js) の `base` も合わせて変更すること。

シークレット未設定の間はワークフローがエラーにならず、リポジトリにコミット済みのサンプルデータでそのままデプロイされる。
