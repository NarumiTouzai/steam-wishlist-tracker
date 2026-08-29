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

export default function GameCard({ game }) {
  const { name, headerImage, storeUrl, price, reviews, comingSoon, releaseDate } = game;
  const onSale = price && !price.isFree && price.discountPercent > 0;
  const tone = reviewTone(reviews?.scoreLabelJa);

  return (
    <a className="game-card" href={storeUrl} target="_blank" rel="noreferrer">
      <div className="game-card__image-wrap">
        <img className="game-card__image" src={headerImage} alt={name} loading="lazy" />
        {onSale && <span className="badge badge--sale">-{price.discountPercent}%</span>}
        {comingSoon && <span className="badge badge--soon">発売前</span>}
      </div>
      <div className="game-card__body">
        <h3 className="game-card__title">{name}</h3>

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
  );
}
