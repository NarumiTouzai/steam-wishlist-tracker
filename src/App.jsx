import { useEffect, useMemo, useState } from 'react';
import data from './data/games.json';
import GameCard from './GameCard.jsx';
import './App.css';

const HIDDEN_KEY = 'wishlist:hiddenAppIds';
const SHOW_GRAPH_KEY = 'wishlist:showGraph';

function loadHidden() {
  try {
    return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

function loadShowGraph() {
  return localStorage.getItem(SHOW_GRAPH_KEY) !== 'false';
}

const SORTS = {
  discount: {
    label: '割引率が高い順',
    compare: (a, b) => (b.price?.discountPercent ?? 0) - (a.price?.discountPercent ?? 0),
  },
  review: {
    label: '評価が高い順',
    compare: (a, b) => (b.reviews?.percentPositive ?? -1) - (a.reviews?.percentPositive ?? -1),
  },
  priceAsc: {
    label: '価格が安い順',
    compare: (a, b) => (a.price?.final ?? Infinity) - (b.price?.final ?? Infinity),
  },
  name: {
    label: '名前順',
    compare: (a, b) => a.name.localeCompare(b.name, 'ja'),
  },
};

function formatUpdatedAt(iso) {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ALL_GENRES = [...new Set(data.games.flatMap((g) => g.genres ?? []))].sort((a, b) =>
  a.localeCompare(b, 'ja'),
);

export default function App() {
  const [sortKey, setSortKey] = useState('discount');
  const [saleOnly, setSaleOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [hiddenIds, setHiddenIds] = useState(loadHidden);
  const [showHidden, setShowHidden] = useState(false);
  const [showGraph, setShowGraph] = useState(loadShowGraph);

  useEffect(() => {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hiddenIds]));
  }, [hiddenIds]);

  useEffect(() => {
    localStorage.setItem(SHOW_GRAPH_KEY, String(showGraph));
  }, [showGraph]);

  function toggleHidden(appid) {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(appid)) next.delete(appid);
      else next.add(appid);
      return next;
    });
  }

  const games = useMemo(() => {
    let list = data.games;
    if (saleOnly) {
      list = list.filter((g) => g.price && !g.price.isFree && g.price.discountPercent > 0);
    }
    if (genre) {
      list = list.filter((g) => g.genres?.includes(genre));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((g) => g.name.toLowerCase().includes(q));
    }
    if (!showHidden) {
      list = list.filter((g) => !hiddenIds.has(g.appid));
    }
    return [...list].sort(SORTS[sortKey].compare);
  }, [sortKey, saleOnly, genre, search, showHidden, hiddenIds]);

  const saleCount = data.games.filter(
    (g) => g.price && !g.price.isFree && g.price.discountPercent > 0,
  ).length;

  return (
    <div className="page">
      <header className="page__header">
        <h1>次にやるゲーム候補</h1>
        <p className="page__meta">
          Discordで貼られたSteam候補 {data.games.length} 件（うちセール中 {saleCount} 件） ・ 最終更新{' '}
          {formatUpdatedAt(data.updatedAt)}
        </p>
      </header>

      <div className="controls">
        <div className="controls__sorts">
          {Object.entries(SORTS).map(([key, { label }]) => (
            <button
              key={key}
              className={`sort-btn ${sortKey === key ? 'sort-btn--active' : ''}`}
              onClick={() => setSortKey(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="controls__filters">
          <input
            type="text"
            className="search-input"
            placeholder="ゲーム名で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="genre-select" value={genre} onChange={(e) => setGenre(e.target.value)}>
            <option value="">すべてのジャンル</option>
            {ALL_GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div className="controls__toggles">
          <label className="controls__toggle">
            <input type="checkbox" checked={saleOnly} onChange={(e) => setSaleOnly(e.target.checked)} />
            セール中のみ表示
          </label>
          <label className="controls__toggle">
            <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
            興味なしを表示（{hiddenIds.size}件）
          </label>
          <label className="controls__toggle">
            <input type="checkbox" checked={showGraph} onChange={(e) => setShowGraph(e.target.checked)} />
            価格推移グラフを表示
          </label>
        </div>
      </div>

      {games.length === 0 ? (
        <p className="empty">該当するゲームがありません。</p>
      ) : (
        <div className="grid">
          {games.map((game) => (
            <GameCard
              key={game.appid}
              game={game}
              hidden={hiddenIds.has(game.appid)}
              onToggleHidden={() => toggleHidden(game.appid)}
              showGraph={showGraph}
            />
          ))}
        </div>
      )}
    </div>
  );
}
