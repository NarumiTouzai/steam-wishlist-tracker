// Discordの指定チャンネルの投稿履歴を取得し、本文中に含まれるSteamストアURLからappidを抽出する。
// Botトークンを使ったREST APIポーリングのみで完結し、常時起動プロセスは不要。
import 'dotenv/config';

const DISCORD_API = 'https://discord.com/api/v10';
const STEAM_URL_RE = /store\.steampowered\.com\/app\/(\d+)/g;
const PAGE_SIZE = 100;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`環境変数 ${name} が設定されていません。`);
  }
  return value;
}

async function fetchMessagesPage(channelId, token, before) {
  const url = new URL(`${DISCORD_API}/channels/${channelId}/messages`);
  url.searchParams.set('limit', String(PAGE_SIZE));
  if (before) url.searchParams.set('before', before);

  const res = await fetch(url, {
    headers: { Authorization: `Bot ${token}` },
  });

  if (res.status === 429) {
    const body = await res.json().catch(() => ({}));
    const retryAfterMs = Math.ceil((body.retry_after ?? 1) * 1000);
    await new Promise((r) => setTimeout(r, retryAfterMs));
    return fetchMessagesPage(channelId, token, before);
  }

  if (!res.ok) {
    throw new Error(`Discord API エラー (${res.status}): ${await res.text()}`);
  }

  return res.json();
}

/**
 * チャンネルの全履歴を遡ってSteam appidの一覧（投稿時刻・投稿者付き）を返す。
 * @returns {Promise<Map<string, { appid: string, firstSeenAt: string, messageUrl: string }>>}
 */
export async function fetchSteamAppIdsFromDiscord() {
  const channelId = requireEnv('DISCORD_CHANNEL_ID');
  const token = requireEnv('DISCORD_BOT_TOKEN');
  const guildId = process.env.DISCORD_GUILD_ID ?? '@me';

  const found = new Map();
  let before;

  while (true) {
    const page = await fetchMessagesPage(channelId, token, before);
    if (page.length === 0) break;

    for (const message of page) {
      const text = message.content ?? '';
      for (const match of text.matchAll(STEAM_URL_RE)) {
        const appid = match[1];
        const existing = found.get(appid);
        const entry = {
          appid,
          firstSeenAt: message.timestamp,
          messageUrl: `https://discord.com/channels/${guildId}/${channelId}/${message.id}`,
        };
        // 同じゲームが複数回貼られている場合は最も古い投稿を採用する
        if (!existing || entry.firstSeenAt < existing.firstSeenAt) {
          found.set(appid, entry);
        }
      }
    }

    before = page[page.length - 1].id;
    if (page.length < PAGE_SIZE) break;
  }

  return found;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await fetchSteamAppIdsFromDiscord();
  console.log(`Discordから ${result.size} 件のSteamアプリを検出しました。`);
  console.log([...result.values()]);
}
