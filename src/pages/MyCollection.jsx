import { useState } from 'react';

const WEI_PER_ETH = 10n ** 18n;
const MAX_LISTING_PRICE = (1n << 96n) - 1n;

function parsePriceWei(value) {
  const price = value.trim();

  if (!/^\d{1,11}(?:\.\d{1,18})?$/.test(price)) {
    throw new Error('Enter a price in ETH with up to 18 decimal places.');
  }

  const [whole, fraction = ''] = price.split('.');
  const wei = BigInt(whole) * WEI_PER_ETH + BigInt(fraction.padEnd(18, '0'));

  if (wei === 0n || wei > MAX_LISTING_PRICE) {
    throw new Error('Enter a positive price within the contract’s limit.');
  }

  return wei;
}

export default function MyCollection({
  artworks = [],
  account,
  wrongNetwork = false,
  loading = false,
  error = '',
  onOpenArtwork,
  onList,
}) {
  const [pendingId, setPendingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const wallet = account?.toLowerCase();
  const owned = wallet
    ? artworks.filter((artwork) => artwork.owner?.toLowerCase() === wallet)
    : [];
  const canList = Boolean(wallet && !wrongNetwork && typeof onList === 'function');

  async function handleList(event, tokenId) {
    event.preventDefault();
    if (!canList || pendingId !== null) return;

    const form = event.currentTarget;
    const price = String(new FormData(form).get('price') ?? '');
    setFeedback(null);
    setPendingId(tokenId);

    try {
      await onList(tokenId, parsePriceWei(price));
      form.reset();
      setFeedback({
        type: 'success',
        message: `Artwork #${tokenId} is listed. Manage it in My Listings.`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error?.code === 4001
            ? 'You cancelled the MetaMask request.'
            : error?.message || 'Could not list this NFT.',
      });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section aria-labelledby="collection-title">
      <h1 id="collection-title" className="text-4xl font-semibold tracking-tight">
        My Collection
      </h1>

      {!account && (
        <p className="mt-4 text-zinc-400">
          Connect MetaMask to view your collection.
        </p>
      )}

      {account && wrongNetwork && (
        <p className="mt-4 text-amber-300">
          Switch to Sepolia to view your collection and list artwork.
        </p>
      )}

      {feedback && (
        <p
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`mt-4 ${
            feedback.type === 'error' ? 'text-red-300' : 'text-emerald-300'
          }`}
        >
          {feedback.message}
        </p>
      )}

      {account && !wrongNetwork && (
        loading ? (
          <p role="status" className="mt-6 text-zinc-400">
            Loading your collection…
          </p>
        ) : error ? (
          <p role="alert" className="mt-6 text-red-300">{error}</p>
        ) : owned.length === 0 ? (
          <p className="mt-6 text-zinc-400">
            Your wallet has no NFTs in this collection.
          </p>
        ) : (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {owned.map((artwork) => {
              const { tokenId, image } = artwork;
              const name = artwork.name || `Artwork #${tokenId}`;
              const busy = pendingId === tokenId;

              return (
                <li
                  key={tokenId}
                  className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
                >
                  {image ? (
                    <img
                      src={image}
                      alt={name}
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="grid aspect-[4/3] place-items-center bg-zinc-800 text-sm text-zinc-400">
                      Image unavailable
                    </div>
                  )}

                  <div className="p-4">
                    <h2 className="break-words text-lg font-semibold">{name}</h2>
                    <p className="mt-1 text-sm text-zinc-400">Token #{tokenId}</p>

                    {onOpenArtwork && (
                      <button
                        type="button"
                        onClick={() => onOpenArtwork(tokenId)}
                        className="mt-3 text-sm text-amber-300 hover:underline"
                      >
                        View details
                      </button>
                    )}

                    <form
                      onSubmit={(event) => handleList(event, tokenId)}
                      className="mt-5 grid gap-3"
                    >
                      <label className="grid gap-2 text-sm text-zinc-300">
                        Price in ETH
                        <input
                          name="price"
                          type="text"
                          inputMode="decimal"
                          placeholder="0.01"
                          required
                          disabled={busy}
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                        />
                      </label>

                      <button
                        type="submit"
                        disabled={!canList || pendingId !== null}
                        className="w-fit rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-200 disabled:opacity-50"
                      >
                        {busy ? 'Listing pending…' : 'List for sale'}
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )
      )}
    </section>
  );
}