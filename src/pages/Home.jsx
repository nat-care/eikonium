export default function Home({ onNavigate, featuredArtwork }) {
  return (
    <section className="eikonium-hero grid items-center gap-10 py-12 sm:py-20 lg:grid-cols-2">
      <div>
        <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl">
          Digital art marketplace
        </h1>

        <p className="mt-5 max-w-lg text-lg text-zinc-400">
          Mint your artwork, list it for sale, and collect NFTs from other
          artists on Sepolia.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onNavigate('Explore')}
            className="rounded-lg bg-amber-300 px-5 py-3 font-semibold text-zinc-950 hover:bg-amber-200"
          >
            Explore artwork
          </button>

          <button
            type="button"
            onClick={() => onNavigate('Create NFT')}
            className="rounded-lg border border-zinc-700 px-5 py-3 font-semibold hover:border-zinc-400"
          >
            Create NFT
          </button>
        </div>
      </div>

      {featuredArtwork?.image && (
        <figure className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <img
            src={featuredArtwork.image}
            alt={featuredArtwork.name || 'Featured artwork'}
            className="aspect-[4/3] w-full object-cover"
          />
          <figcaption className="p-4">
            <p className="text-sm text-amber-300">Featured artwork</p>
            <p className="mt-1 text-lg font-medium">
              {featuredArtwork.name || 'Untitled artwork'}
            </p>
          </figcaption>
        </figure>
      )}
    </section>
  );
}