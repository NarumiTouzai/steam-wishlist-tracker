// 日々の価格を src/data/priceHistory.json に蓄積し、過去最安値とスパークライン用の推移データを管理する。
import { readFile, writeFile } from 'node:fs/promises';

const HISTORY_MAX_DAYS = 180; // 保持期間（これより古い記録は間引く）

export async function loadHistory(path) {
  try {
    return JSON.parse(await readFile(path, 'utf-8'));
  } catch {
    return {};
  }
}

export async function saveHistory(path, history) {
  await writeFile(path, JSON.stringify(history, null, 2) + '\n', 'utf-8');
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * games（価格情報つき）で history を更新し、更新後の history を返す。
 * @param {object} history
 * @param {Array} games
 */
export function updateHistory(history, games) {
  const today = todayKey();
  const cutoff = new Date(Date.now() - HISTORY_MAX_DAYS * 86400000).toISOString().slice(0, 10);

  for (const game of games) {
    if (!game.price || game.price.isFree || game.price.final == null) continue;
    const key = String(game.appid);
    const entry = history[key] ?? { points: [], lowestFinal: null, lowestDate: null, highestFinal: null };
    const last = entry.points[entry.points.length - 1];

    if (last && last.date === today) {
      last.final = game.price.final; // 同日に複数回実行された場合は上書き
    } else {
      entry.points.push({ date: today, final: game.price.final });
    }
    entry.points = entry.points.filter((p) => p.date >= cutoff);

    if (entry.lowestFinal == null || game.price.final < entry.lowestFinal) {
      entry.lowestFinal = game.price.final;
      entry.lowestDate = today;
    }
    if (entry.highestFinal == null || game.price.final > entry.highestFinal) {
      entry.highestFinal = game.price.final;
    }

    history[key] = entry;
  }

  return history;
}

/**
 * game に priceHistory（推移データ + 過去最安値）を付与する。履歴が無いゲームはそのまま返す。
 */
export function attachHistory(history, game) {
  const entry = history[String(game.appid)];
  if (!entry) return game;
  return {
    ...game,
    priceHistory: {
      points: entry.points,
      lowestFinal: entry.lowestFinal,
      lowestDate: entry.lowestDate,
      highestFinal: entry.highestFinal,
    },
  };
}
