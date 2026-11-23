import { useState } from 'react';

export default function Explore({
  artworks = [],
  loading = false,
  error = '',
  onOpenArtwork,
}) {
  const [search, setSearch] = useState('');
  const [availability, setAvailability] = useState('all');
  const query = search.trim().toLowerCase();

  const results = artworks.filter((artwork) => {
    const name = artwork.name?.toLowerCase() ?? '';
    const tokenId = String(artwork.tokenId);
    const matchesSearch =
      name.includes(query) || tokenId.includes(query.replace(/^#/, ''));

    return matchesSearch && (availability === 'all' || artwork.isForSale);
  });

  return (
    <section aria-labelledby="explore-title">
      <h1 id="explore-title" className="text-4xl font-semibold tracking-tight">
        Explore artwork
      </h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto]">
        <label className="grid gap-2 text-sm text-zinc-300">
          Search artwork
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or token ID"
            className="min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white"
          />
        </label>

        <label className="grid gap-2 text-sm text-zinc-300">
          Availability
          <select
            value={availability}
            onChange={(event) => setAvailability(event.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white"
          >
            <option value="all">All artwork</option>
            <option value="for-sale">For sale</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p role="status" className="mt-8 text-zinc-400">
          Loading artwork…
        </p>
      ) : error ? (
        <p role="alert" className="mt-8 text-red-300">{error}</p>
      ) : results.length === 0 ? (
        <p className="mt-8 text-zinc-400">
          {artworks.length === 0
            ? 'No artwork has been minted yet.'
            : 'No artwork matches your search or filter.'}
        </p>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((artwork) => {
            const name = artwork.name || `Artwork #${artwork.tokenId}`;

            return (
              <li key={artwork.tokenId}>
                <button
                  type="button"
                  onClick={() => onOpenArtwork(artwork.tokenId)}
                  className="h-full w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 text-left hover:border-amber-300"
                >
                  {artwork.image ? (
                    <img
                      src={artwork.image}
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
                    <h2 className="break-words text-lg font-semibold">
                      {name}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      Token #{artwork.tokenId}
                    </p>
                    <p className="mt-3 text-sm font-medium text-amber-300">
                      {artwork.isForSale
                        ? artwork.priceEth != null
                          ? `${artwork.priceEth} ETH`
                          : 'For sale'
                        : 'Not for sale'}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}