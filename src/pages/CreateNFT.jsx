import { useState } from 'react';

export default function CreateNFT({
  account,
  wrongNetwork = false,
  onCreate,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const canCreate = Boolean(account && !wrongNetwork && onCreate);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canCreate || busy) return;

    const form = event.currentTarget;
    const fields = new FormData(form);
    const name = String(fields.get('name') ?? '').trim();
    const description = String(fields.get('description') ?? '').trim();
    const file = fields.get('artwork');

    setError('');
    setSuccess(false);

    if (!name || !description) {
      setError('Enter an artwork name and description.');
      return;
    }

    if (!(file instanceof File) || !file.size || !file.type.startsWith('image/')) {
      setError('Choose an image file for your artwork.');
      return;
    }

    setBusy(true);

    try {
      await onCreate({ name, description, file });
      form.reset();
      setSuccess(true);
    } catch (error) {
      setError(
        error?.code === 4001
          ? 'You cancelled the MetaMask request.'
          : error?.message || 'Could not create the NFT. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100';

  return (
    <section aria-labelledby="create-title" className="max-w-xl">
      <h1 id="create-title" className="text-4xl font-semibold tracking-tight">
        Create NFT
      </h1>

      {!account ? (
        <p className="mt-3 text-sm text-amber-300">
          Connect MetaMask to mint your artwork.
        </p>
      ) : wrongNetwork ? (
        <p className="mt-3 text-sm text-amber-300">
          Switch to Sepolia to mint your artwork.
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6">
        <fieldset disabled={busy} className="grid gap-5">
          <label className="grid gap-2 text-sm text-zinc-300">
            Artwork image
            <input
              type="file"
              name="artwork"
              accept="image/*"
              required
              className={`${inputClass} file:mr-4 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-zinc-100`}
            />
          </label>

          <label className="grid gap-2 text-sm text-zinc-300">
            Name
            <input
              name="name"
              type="text"
              placeholder="Cyber Bangkok #001"
              required
              className={inputClass}
            />
          </label>

          <label className="grid gap-2 text-sm text-zinc-300">
            Description
            <textarea
              name="description"
              rows={4}
              required
              className={inputClass}
            />
          </label>

          <button
            type="submit"
            disabled={!canCreate || busy}
            className="w-fit rounded-lg bg-amber-300 px-5 py-3 font-semibold text-zinc-950 hover:bg-amber-200 disabled:opacity-50"
          >
            {busy ? 'Creating NFT…' : 'Mint NFT'}
          </button>
        </fieldset>

        {busy && (
          <p role="status" className="mt-4 text-sm text-zinc-400">
            Keep this page open and confirm the transaction when MetaMask prompts you.
          </p>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>
        )}

        {success && (
          <p role="status" className="mt-4 text-sm text-emerald-300">
            NFT minted. You can view it in My Collection.
          </p>
        )}
      </form>
    </section>
  );
}