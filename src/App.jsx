import { useMemo, useState } from 'react';
import data from './data/games.json';
import GameCard from './GameCard.jsx';
import './App.css';

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

export default function App() {
  const [sortKey, setSortKey] = useState('discount');
  const [saleOnly, setSaleOnly] = useState(false);

  const games = useMemo(() => {
    let list = data.games;
    if (saleOnly) {
      list = list.filter((g) => g.price && !g.price.isFree && g.price.discountPercent > 0);
    }
    return [...list].sort(SORTS[sortKey].compare);
  }, [sortKey, saleOnly]);

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
        <label className="controls__toggle">
          <input type="checkbox" checked={saleOnly} onChange={(e) => setSaleOnly(e.target.checked)} />
          セール中のみ表示
        </label>
      </div>

      {games.length === 0 ? (
        <p className="empty">該当するゲームがありません。</p>
      ) : (
        <div className="grid">
          {games.map((game) => (
            <GameCard key={game.appid} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
