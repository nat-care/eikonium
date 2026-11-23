export default function ArtworkDetail({
  artwork,
  account,
  wrongNetwork = false,
  loading = false,
  buying = false,
  error = '',
  onBack,
  onBuy,
}) {
  const forSale = Boolean(artwork?.isForSale);
  const isSeller = Boolean(
    account && artwork?.seller?.toLowerCase() === account.toLowerCase(),
  );

  const canBuy =
    forSale &&
    Boolean(account) &&
    !wrongNetwork &&
    !isSeller &&
    !buying &&
    artwork.listingId != null &&
    artwork.priceWei != null &&
    typeof onBuy === 'function';

  const name = artwork?.name || `Artwork #${artwork?.tokenId}`;

  return (
    <section aria-labelledby="artwork-title">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 text-sm text-zinc-400 hover:text-white"
      >
        ← Back to Explore
      </button>

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <p role="status" className="text-zinc-400">Loading artwork…</p>
      ) : artwork ? (
        <div className="grid items-start gap-8 lg:grid-cols-2">
          {artwork.image ? (
            <img
              src={artwork.image}
              alt={name}
              className="aspect-square w-full rounded-2xl border border-zinc-800 bg-zinc-900 object-contain"
            />
          ) : (
            <div className="grid aspect-square place-items-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-400">
              Image unavailable
            </div>
          )}

          <div>
            <p className="text-sm text-zinc-400">Token #{artwork.tokenId}</p>
            <h1 id="artwork-title" className="mt-2 break-words text-4xl font-semibold">
              {name}
            </h1>

            {artwork.description && (
              <p className="mt-4 whitespace-pre-wrap break-words text-zinc-300">
                {artwork.description}
              </p>
            )}

            <dl className="mt-6 space-y-4">
              <div>
                <dt className="text-sm text-zinc-400">On-chain owner</dt>
                <dd className="mt-1 break-all font-mono text-sm">
                  {artwork.owner || 'Unavailable'}
                </dd>
              </div>

              {forSale && (
                <div>
                  <dt className="text-sm text-zinc-400">Seller</dt>
                  <dd className="mt-1 break-all font-mono text-sm">
                    {artwork.seller || 'Unavailable'}
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xl font-semibold text-amber-300">
                {forSale
                  ? artwork.priceEth != null
                    ? `${artwork.priceEth} ETH`
                    : 'For sale'
                  : 'Not for sale'}
              </p>

              {forSale && (
                <>
                  <button
                    type="button"
                    disabled={!canBuy}
                    onClick={() => onBuy(artwork.listingId, artwork.priceWei)}
                    className="mt-4 rounded-lg bg-amber-300 px-5 py-3 font-semibold text-zinc-950 hover:bg-amber-200 disabled:opacity-50"
                  >
                    {buying ? 'Purchase pending…' : 'Buy NFT'}
                  </button>

                  {!account ? (
                    <p className="mt-3 text-sm text-zinc-400">
                      Connect MetaMask to buy this NFT.
                    </p>
                  ) : wrongNetwork ? (
                    <p className="mt-3 text-sm text-zinc-400">
                      Switch to Sepolia to buy this NFT.
                    </p>
                  ) : isSeller ? (
                    <p className="mt-3 text-sm text-zinc-400">
                      Manage your listing in My Listings.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <h1 id="artwork-title" className="text-xl font-semibold">
          Artwork unavailable
        </h1>
      )}
    </section>
  );
}