// appidごとにSteamストアの価格・セール情報とレビュー概要を取得する。
// 非公式だが広く使われている公開エンドポイントのみを使用（APIキー不要）。
const APPDETAILS_URL = 'https://store.steampowered.com/api/appdetails';
const APPREVIEWS_URL = 'https://store.steampowered.com/appreviews';

// Steamが内部的に使うreview_score(0-9)を公式ストアと同じ日本語表記に対応させる
export const REVIEW_SCORE_LABELS_JA = {
  0: 'レビューなし',
  1: '圧倒的に不評',
  2: '非常に不評',
  3: '不評',
  4: 'やや不評',
  5: '賛否両論',
  6: 'やや好評',
  7: '好評',
  8: '非常に好評',
  9: '圧倒的に好評',
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJsonWithRetry(url, { retries = 3, delayMs = 1500 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url);
    if (res.status === 429 && attempt < retries) {
      await sleep(delayMs * (attempt + 1));
      continue;
    }
    if (!res.ok) {
      throw new Error(`リクエスト失敗 (${res.status}): ${url}`);
    }
    return res.json();
  }
  throw new Error(`リトライ上限に達しました: ${url}`);
}

async function fetchAppDetails(appid) {
  const url = `${APPDETAILS_URL}?appids=${appid}&cc=jp&l=japanese`;
  const json = await fetchJsonWithRetry(url);
  const entry = json[appid];
  if (!entry?.success) return null;
  return entry.data;
}

async function fetchAppReviews(appid) {
  const url = `${APPREVIEWS_URL}/${appid}?json=1&language=all&purchase_type=all&num_per_page=0`;
  const json = await fetchJsonWithRetry(url);
  return json.query_summary ?? null;
}

/**
 * 1つのSteam appidについて、ストアに表示するための情報一式を組み立てる。
 */
export async function fetchGameInfo(appid) {
  const [details, reviews] = await Promise.all([
    fetchAppDetails(appid),
    fetchAppReviews(appid),
  ]);

  if (!details) {
    return { appid, unavailable: true };
  }

  const priceInfo = details.is_free
    ? { isFree: true, discountPercent: 0 }
    : details.price_overview
      ? {
          isFree: false,
          currency: details.price_overview.currency,
          initial: details.price_overview.initial, // 最小通貨単位×100
          final: details.price_overview.final,
          discountPercent: details.price_overview.discount_percent,
        }
      : null; // 未発売・価格未設定など

  return {
    appid,
    name: details.name,
    headerImage: details.header_image,
    storeUrl: `https://store.steampowered.com/app/${appid}`,
    releaseDate: details.release_date?.date ?? null,
    comingSoon: details.release_date?.coming_soon ?? false,
    price: priceInfo,
    reviews: reviews
      ? {
          scoreDesc: reviews.review_score_desc,
          scoreLabelJa: REVIEW_SCORE_LABELS_JA[reviews.review_score] ?? reviews.review_score_desc,
          totalPositive: reviews.total_positive,
          totalNegative: reviews.total_negative,
          totalReviews: reviews.total_reviews,
          percentPositive:
            reviews.total_reviews > 0
              ? Math.round((reviews.total_positive / reviews.total_reviews) * 100)
              : null,
        }
      : null,
  };
}

/**
 * 複数appidを、Steam側のレート制限に配慮しながら順番に取得する。
 */
export async function fetchAllGameInfo(appids, { delayMs = 1200, onProgress } = {}) {
  const results = [];
  for (const appid of appids) {
    const info = await fetchGameInfo(appid);
    results.push(info);
    onProgress?.(info, results.length, appids.length);
    if (results.length < appids.length) await sleep(delayMs);
  }
  return results;
}
