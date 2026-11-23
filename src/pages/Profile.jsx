export default function Profile({
  account,
  balanceEth,
  artworks = [],
  wrongNetwork = false,
  loading = false,
  error = '',
  onOpenArtwork,
}) {
  const wallet = account?.toLowerCase();
  const createdArtwork = wallet
    ? artworks.filter((artwork) => artwork.creator?.toLowerCase() === wallet)
    : [];

  return (
    <section aria-labelledby="profile-title">
      <h1 id="profile-title" className="text-4xl font-semibold tracking-tight">
        Profile
      </h1>

      {!account && (
        <p className="mt-4 text-zinc-400">
          Connect MetaMask to view your profile.
        </p>
      )}

      {account && (
        <dl className="mt-6 grid gap-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:grid-cols-[2fr_1fr]">
          <div className="min-w-0">
            <dt className="text-sm text-zinc-400">Wallet address</dt>
            <dd className="mt-2 break-all font-mono text-sm">{account}</dd>
          </div>

          <div>
            <dt className="text-sm text-zinc-400">Sepolia wallet balance</dt>
            <dd className="mt-2 font-semibold">
              {!wrongNetwork && balanceEth != null
                ? `${balanceEth} ETH`
                : '—'}
            </dd>
          </div>
        </dl>
      )}

      {account && wrongNetwork && (
        <p className="mt-4 text-amber-300">
          Switch to Sepolia to see your balance and created artwork.
        </p>
      )}

      {account && !wrongNetwork && (
        <section aria-labelledby="created-title" className="mt-10">
          <h2 id="created-title" className="text-2xl font-semibold">
            Created artwork
          </h2>

          {loading ? (
            <p role="status" className="mt-4 text-zinc-400">
              Loading your artwork…
            </p>
          ) : error ? (
            <p role="alert" className="mt-4 text-red-300">{error}</p>
          ) : createdArtwork.length === 0 ? (
            <p className="mt-4 text-zinc-400">
              You haven’t minted any artwork yet.
            </p>
          ) : (
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {createdArtwork.map(({ tokenId, name, image }) => (
                <li
                  key={String(tokenId)}
                  className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
                >
                  {image ? (
                    <img
                      src={image}
                      alt=""
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="grid aspect-[4/3] place-items-center bg-zinc-800 text-sm text-zinc-400">
                      Image unavailable
                    </div>
                  )}

                  <div className="p-4">
                    <h3 className="break-words text-lg font-semibold">
                      {name || `Artwork #${tokenId}`}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-400">
                      Token #{tokenId}
                    </p>

                    {onOpenArtwork && (
                      <button
                        type="button"
                        onClick={() => onOpenArtwork(tokenId)}
                        className="mt-3 text-sm text-amber-300 hover:underline"
                        aria-label={`View details for token ${tokenId}`}
                      >
                        View details
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </section>
  );
}