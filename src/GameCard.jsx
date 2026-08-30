function formatPrice(cents, currency) {
  if (cents == null) return '-';
  const amount = cents / 100;
  if (currency === 'JPY') return `¥${amount.toLocaleString('ja-JP')}`;
  return `${amount.toLocaleString()} ${currency}`;
}

function reviewTone(scoreLabelJa) {
  if (!scoreLabelJa) return 'none';
  if (scoreLabelJa.includes('好評')) return scoreLabelJa === 'やや好評' ? 'mixed' : 'positive';
  if (scoreLabelJa.includes('不評')) return 'negative';
  if (scoreLabelJa === '賛否両論') return 'mixed';
  return 'none';
}

function Sparkline({ points, currency }) {
  if (!points || points.length < 2) return null;
  const values = points.map((p) => p.final);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const latest = values[values.length - 1];
  const w = 100;
  const h = 24;
  const range = max - min || 1;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p.final - min) / range) * h;
    return `${x},${y}`;
  });

  return (
    <div className="sparkline-wrap">
      <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <polyline points={coords.join(' ')} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
      </svg>
      <div className="sparkline-labels">
        <span>最安 {formatPrice(min, currency)}</span>
        <span>最新 {formatPrice(latest, currency)}</span>
      </div>
    </div>
  );
}

export default function GameCard({ game, hidden, onToggleHidden, showGraph }) {
  const { name, headerImage, storeUrl, price, reviews, comingSoon, releaseDate, genres, priceHistory } = game;
  const onSale = price && !price.isFree && price.discountPercent > 0;
  const tone = reviewTone(reviews?.scoreLabelJa);
  const isAllTimeLow =
    price &&
    !price.isFree &&
    priceHistory?.points?.length >= 2 &&
    price.final <= priceHistory.lowestFinal;

  return (
    <div className={`game-card ${hidden ? 'game-card--hidden' : ''}`}>
      <a className="game-card__link" href={storeUrl} target="_blank" rel="noreferrer">
        <div className="game-card__image-wrap">
          <img className="game-card__image" src={headerImage} alt={name} loading="lazy" />
          {onSale && <span className="badge badge--sale">-{price.discountPercent}%</span>}
          {comingSoon && <span className="badge badge--soon">発売前</span>}
          {isAllTimeLow && !comingSoon && <span className="badge badge--low">史上最安値</span>}
        </div>
        <div className="game-card__body">
          <h3 className="game-card__title">{name}</h3>
          {genres?.length > 0 && <p className="game-card__genres">{genres.join(' / ')}</p>}

          <div className="game-card__price">
            {price?.isFree ? (
              <span className="price price--free">無料</span>
            ) : price ? (
              onSale ? (
                <>
                  <span className="price price--original">{formatPrice(price.initial, price.currency)}</span>
                  <span className="price price--final">{formatPrice(price.final, price.currency)}</span>
                </>
              ) : (
                <span className="price">{formatPrice(price.final, price.currency)}</span>
              )
            ) : (
              <span className="price price--unknown">{releaseDate ?? '価格情報なし'}</span>
            )}
          </div>

          {priceHistory?.points?.length >= 2 && !isAllTimeLow && (
            <p className="game-card__lowest">
              過去最安値: {formatPrice(priceHistory.lowestFinal, price?.currency)}
            </p>
          )}

          {showGraph && priceHistory?.points?.length === 1 && (
            <p className="game-card__history-pending">価格推移: 記録中（データが貯まり次第グラフ表示）</p>
          )}

          {showGraph && <Sparkline points={priceHistory?.points} currency={price?.currency} />}

          {reviews && (
            <div className={`review review--${tone}`}>
              <span className="review__label">{reviews.scoreLabelJa}</span>
              {reviews.percentPositive != null && (
                <span className="review__percent">
                  {reviews.percentPositive}%（{reviews.totalReviews.toLocaleString('ja-JP')}件）
                </span>
              )}
            </div>
          )}
        </div>
      </a>
      <button type="button" className="game-card__hide-btn" onClick={onToggleHidden}>
        {hidden ? '↺ リストに戻す' : '✕ 興味なしにする'}
      </button>
    </div>
  );
}
