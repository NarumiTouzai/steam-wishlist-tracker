// Discordチャンネルの投稿からSteam候補を集め、価格・レビュー情報を付与してJSON化する。
// GitHub Actions（スケジュール実行）とローカルの両方から `npm run fetch-data` で実行する想定。
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchSteamAppIdsFromDiscord } from './fetchDiscordSteamLinks.mjs';
import { fetchAllGameInfo } from './fetchSteamData.mjs';
import { loadHistory, saveHistory, updateHistory, attachHistory } from './priceHistory.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '..', 'src', 'data', 'games.json');
const HISTORY_PATH = join(__dirname, '..', 'src', 'data', 'priceHistory.json');

async function main() {
  if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_CHANNEL_ID) {
    console.warn(
      'DISCORD_BOT_TOKEN / DISCORD_CHANNEL_ID が未設定のため、データ取得をスキップします（既存のsrc/data/games.jsonをそのまま使用）。',
    );
    return;
  }

  console.log('Discordからcandidate appidを収集中...');
  const discordEntries = await fetchSteamAppIdsFromDiscord();
  const appids = [...discordEntries.keys()];
  console.log(`${appids.length} 件のappidを検出。Steamストア情報を取得します。`);

  const gameInfos = await fetchAllGameInfo(appids, {
    onProgress: (info, done, total) => {
      console.log(`[${done}/${total}] ${info.unavailable ? `appid ${info.appid} (取得不可)` : info.name}`);
    },
  });

  const gamesWithoutHistory = gameInfos
    .filter((info) => !info.unavailable)
    .map((info) => ({
      ...info,
      discord: discordEntries.get(String(info.appid)),
    }));

  const history = updateHistory(await loadHistory(HISTORY_PATH), gamesWithoutHistory);
  await saveHistory(HISTORY_PATH, history);
  const games = gamesWithoutHistory.map((game) => attachHistory(history, game));

  const output = {
    updatedAt: new Date().toISOString(),
    sourceChannelId: process.env.DISCORD_CHANNEL_ID ?? null,
    totalCandidates: appids.length,
    unavailableCount: gameInfos.length - games.length,
    games,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf-8');
  console.log(`書き出し完了: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
