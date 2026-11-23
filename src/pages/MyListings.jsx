import { useState } from 'react';

const primaryButton =
  'rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-200 disabled:opacity-50';

const secondaryButton =
  'rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold hover:border-zinc-400 disabled:opacity-50';

function parsePriceWei(value) {
  const price = value.trim();

  if (!/^\d+(?:\.\d{1,18})?$/.test(price)) {
    throw new Error('Enter a price in ETH with up to 18 decimal places.');
  }

  const [whole, fraction = ''] = price.split('.');
  const wei = BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, '0'));

  if (wei === 0n || wei >= 2n ** 96n) {
    throw new Error('Enter a positive price within the contract’s limit.');
  }

  return wei;
}

export default function MyListings({
  artworks = [],
  account,
  wrongNetwork = false,
  loading = false,
  error = '',
  proceedsEth = '0',
  hasProceeds = false,
  onUpdatePrice,
  onCancelListing,
  onWithdraw,
}) {
  const [pending, setPending] = useState('');
  const [feedback, setFeedback] = useState(null);

  const wallet = account?.toLowerCase();
  const ready = Boolean(wallet && !wrongNetwork);
  const listings = ready
    ? artworks.filter(
        (artwork) =>
          artwork.isForSale &&
          artwork.listingId != null &&
          artwork.seller?.toLowerCase() === wallet,
      )
    : [];

  async function runAction(action, submit, successMessage) {
    if (!ready || pending) return;

    setFeedback(null);
    setPending(action);

    try {
      await submit();
      setFeedback({ message: successMessage });
    } catch (error) {
      setFeedback({
        failed: true,
        message:
          error?.code === 4001
            ? 'You cancelled the MetaMask request.'
            : error?.message || 'The transaction could not be completed.',
      });
    } finally {
      setPending('');
    }
  }

  function handlePriceUpdate(event, listingId) {
    event.preventDefault();
    if (!onUpdatePrice) return;

    const form = event.currentTarget;
    const price = String(new FormData(form).get('price') ?? '');

    return runAction(
      `price-${listingId}`,
      async () => {
        await onUpdatePrice(listingId, parsePriceWei(price));
        form.reset();
      },
      'Listing price updated.',
    );
  }

  return (
    <section aria-labelledby="listings-title">
      <h1 id="listings-title" className="text-4xl font-semibold tracking-tight">
        My Listings
      </h1>

      {!ready && (
        <p className="mt-4 text-amber-300">
          {account
            ? 'Switch to Sepolia to manage your listings.'
            : 'Connect MetaMask to manage your listings.'}
        </p>
      )}

      {feedback && (
        <p
          role={feedback.failed ? 'alert' : 'status'}
          className={`mt-4 ${feedback.failed ? 'text-red-300' : 'text-emerald-300'}`}
        >
          {feedback.message}
        </p>
      )}

      {ready && (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div>
              <h2 className="text-sm text-zinc-400">Available to withdraw</h2>
              <p className="mt-1 text-xl font-semibold">{proceedsEth} ETH</p>
            </div>

            <button
              type="button"
              disabled={!hasProceeds || !onWithdraw || Boolean(pending)}
              onClick={() =>
                runAction('withdraw', onWithdraw, 'Sale proceeds withdrawn.')
              }
              className={primaryButton}
            >
              {pending === 'withdraw' ? 'Withdrawal pending…' : 'Withdraw ETH'}
            </button>
          </div>

          {loading ? (
            <p role="status" className="mt-6 text-zinc-400">Loading listings…</p>
          ) : error ? (
            <p role="alert" className="mt-6 text-red-300">{error}</p>
          ) : listings.length === 0 ? (
            <p className="mt-6 text-zinc-400">You have no active listings.</p>
          ) : (
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map(({ listingId, tokenId, name, image, priceEth }) => (
                <li
                  key={String(listingId)}
                  className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
                >
                  {image && (
                    <img
                      src={image}
                      alt=""
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  )}

                  <div className="p-4">
                    <h2 className="break-words text-lg font-semibold">
                      {name || `Artwork #${tokenId}`}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-400">Token #{tokenId}</p>
                    <p className="mt-3 font-semibold text-amber-300">
                      {priceEth != null ? `${priceEth} ETH` : 'Price unavailable'}
                    </p>

                    <form
                      onSubmit={(event) => handlePriceUpdate(event, listingId)}
                      className="mt-5 grid gap-3"
                    >
                      <label className="grid gap-2 text-sm text-zinc-300">
                        New price in ETH
                        <input
                          name="price"
                          type="text"
                          inputMode="decimal"
                          placeholder="0.01"
                          required
                          disabled={Boolean(pending)}
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                        />
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={!onUpdatePrice || Boolean(pending)}
                          className={primaryButton}
                        >
                          {pending === `price-${listingId}`
                            ? 'Update pending…'
                            : 'Update price'}
                        </button>

                        <button
                          type="button"
                          disabled={!onCancelListing || Boolean(pending)}
                          onClick={() =>
                            runAction(
                              `cancel-${listingId}`,
                              () => onCancelListing(listingId),
                              'Listing cancelled. The NFT is back in My Collection.',
                            )
                          }
                          className={secondaryButton}
                        >
                          {pending === `cancel-${listingId}`
                            ? 'Cancellation pending…'
                            : 'Cancel listing'}
                        </button>
                      </div>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}