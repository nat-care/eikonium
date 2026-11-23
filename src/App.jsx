import { useEffect, useRef, useState } from 'react';
import Home from './pages/Home.jsx';
import Explore from './pages/Explore.jsx';
import ArtworkDetail from './pages/ArtworkDetail.jsx';
import CreateNFT from './pages/CreateNFT.jsx';
import MyCollection from './pages/MyCollection.jsx';
import MyListings from './pages/MyListings.jsx';
import Profile from './pages/Profile.jsx';
import {
  buyNFT,
  cancelListing,
  getArtworks,
  getProceeds,
  getWalletBalance,
  listNFT,
  mintNFT,
  updatePrice,
  withdraw,
} from './web3/eikonium.js';
import {
  uploadArtworkMetadata,
  uploadsConfigured,
} from './services/cloudinary.js';
import './App.css';

const SEPOLIA = '0xaa36a7';

const pages = [
  'Home',
  'Explore',
  'Create NFT',
  'My Collection',
  'My Listings',
  'Profile',
];

export default function App() {
  const provider = window.ethereum;
  const [page, setPage] = useState('Home');
  const [detail, setDetail] = useState(null);
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState('');
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletMessage, setWalletMessage] = useState('');
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [artworkError, setArtworkError] = useState('');
  const [walletData, setWalletData] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [buying, setBuying] = useState(false);
  const [purchase, setPurchase] = useState(null);
  const transactionPending = useRef(false);

  const onSepolia = chainId === SEPOLIA;
  const wrongNetwork = Boolean(account && !onSepolia);
  const wallet = { account, wrongNetwork };
  const walletKey = `${chainId}:${account}`;
  const artworkList = onSepolia ? artworks : [];
  const balances =
    onSepolia && walletData?.account === account ? walletData : null;
  const currentPurchase =
    purchase?.walletKey === walletKey &&
    purchase?.tokenId === detail?.tokenId
      ? purchase
      : null;

  useEffect(() => {
    if (!provider) return;

    let active = true;
    let accountVersion = 0;
    let chainVersion = 0;

    function updateAccounts(accounts) {
      accountVersion += 1;
      setAccount(accounts[0]?.toLowerCase() ?? '');
    }

    function updateChain(network) {
      chainVersion += 1;
      setChainId(network);
    }

    async function syncWallet() {
      const accountRequest = ++accountVersion;
      const chainRequest = ++chainVersion;

      const [accounts, network] = await Promise.allSettled([
        provider.request({ method: 'eth_accounts' }),
        provider.request({ method: 'eth_chainId' }),
      ]);

      if (!active) return;

      if (
        accounts.status === 'fulfilled' &&
        accountRequest === accountVersion
      ) {
        updateAccounts(accounts.value);
      }

      if (
        network.status === 'fulfilled' &&
        chainRequest === chainVersion
      ) {
        updateChain(network.value);
      }
    }

    function syncWhenVisible() {
      if (document.visibilityState === 'visible') void syncWallet();
    }

    provider.on('accountsChanged', updateAccounts);
    provider.on('chainChanged', updateChain);
    window.addEventListener('focus', syncWallet);
    document.addEventListener('visibilitychange', syncWhenVisible);
    void syncWallet();

    return () => {
      active = false;
      provider.removeListener('accountsChanged', updateAccounts);
      provider.removeListener('chainChanged', updateChain);
      window.removeEventListener('focus', syncWallet);
      document.removeEventListener('visibilitychange', syncWhenVisible);
    };
  }, [provider]);

  useEffect(() => {
    if (!onSepolia) {
      setArtworks([]);
      setArtworkError('');
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setArtworkError('');

    getArtworks()
      .then((items) => {
        if (active) setArtworks(items);
      })
      .catch((error) => {
        if (active) {
          setArtworkError(error?.message || 'Could not load artwork.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [onSepolia, refresh]);

  useEffect(() => {
    setWalletData(null);
    if (!account || !onSepolia) return;

    let active = true;

    Promise.allSettled([getWalletBalance(account), getProceeds(account)])
      .then(([balance, proceeds]) => {
        if (!active) return;

        setWalletData({
          account,
          balanceEth: balance.status === 'fulfilled' ? balance.value : undefined,
          proceeds: proceeds.status === 'fulfilled' ? proceeds.value : undefined,
          error: balance.status === 'rejected' || proceeds.status === 'rejected',
        });
      });

    return () => {
      active = false;
    };
  }, [account, onSepolia, refresh]);

  async function connectWallet() {
    setWalletMessage('');

    if (!provider) {
      setWalletMessage('Install MetaMask to connect your wallet.');
      return;
    }

    setWalletBusy(true);

    try {
      if (wrongNetwork) {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: SEPOLIA }],
        });
      } else {
        await provider.request({ method: 'eth_requestAccounts' });
      }

      const [accounts, network] = await Promise.all([
        provider.request({ method: 'eth_accounts' }),
        provider.request({ method: 'eth_chainId' }),
      ]);

      setAccount(accounts[0]?.toLowerCase() ?? '');
      setChainId(network);
    } catch (error) {
      if (error?.code === 4902) {
        setWalletMessage('Enable Sepolia in MetaMask, then try again.');
      } else if (error?.code === 4001) {
        setWalletMessage('The MetaMask request was cancelled.');
      } else {
        setWalletMessage(error?.message || 'Could not connect MetaMask.');
      }
    } finally {
      setWalletBusy(false);
    }
  }

  async function verifyWallet() {
    const [accounts, network] = await Promise.all([
      provider.request({ method: 'eth_accounts' }),
      provider.request({ method: 'eth_chainId' }),
    ]);

    if (
      accounts[0]?.toLowerCase() !== account ||
      network !== SEPOLIA
    ) {
      throw new Error('Switch back to the original wallet on Sepolia.');
    }
  }

  async function transact(send, ...args) {
    if (!account || !onSepolia) {
      throw new Error('Connect MetaMask on Sepolia first.');
    }

    if (transactionPending.current) {
      throw new Error('Wait for the current transaction.');
    }

    transactionPending.current = true;

    try {
      await verifyWallet();
      const receipt = await send(...args);
      setRefresh((value) => value + 1);
      return receipt;
    } finally {
      transactionPending.current = false;
    }
  }

  function createArtwork(artwork) {
    return transact(async () => {
      const metadataURI = await uploadArtworkMetadata(artwork);
      await verifyWallet();
      return mintNFT(metadataURI);
    });
  }

  function openArtwork(tokenId) {
    setPurchase(null);
    setDetail({ tokenId: String(tokenId), from: page });
    setPage('Artwork Detail');
  }

  async function buyArtwork(listingId, priceWei) {
    if (transactionPending.current) return;

    const context = { walletKey, tokenId: detail?.tokenId };
    setBuying(true);
    setPurchase(null);

    try {
      await transact(buyNFT, listingId, priceWei);
      setPurchase({
        ...context,
        message: 'Purchase confirmed. View your NFT in My Collection.',
      });
    } catch (error) {
      setPurchase({
        ...context,
        failed: true,
        message: error?.code === 4001
          ? 'Purchase cancelled.'
          : error?.message || 'Could not buy this NFT.',
      });
    } finally {
      setBuying(false);
    }
  }

  const catalog = {
    artworks: artworkList,
    loading,
    error: !provider
      ? 'Install MetaMask to load artwork.'
      : chainId && !onSepolia
        ? 'Switch MetaMask to Sepolia to load artwork.'
        : artworkError,
    onOpenArtwork: openArtwork,
  };

  const views = {
    Home: (
      <Home
        onNavigate={setPage}
        featuredArtwork={artworkList.find(({ image }) => Boolean(image))}
      />
    ),
    Explore: <Explore {...catalog} />,
    'Artwork Detail': (
      <>
        {currentPurchase && !currentPurchase.failed && (
          <p role="status" className="mb-4 text-emerald-300">
            {currentPurchase.message}
          </p>
        )}
        <ArtworkDetail
          {...wallet}
          artwork={artworkList.find(
            ({ tokenId }) => String(tokenId) === detail?.tokenId,
          )}
          loading={loading}
          error={currentPurchase?.failed ? currentPurchase.message : catalog.error}
          buying={buying}
          onBack={() => setPage(detail?.from ?? 'Explore')}
          onBuy={buyArtwork}
        />
      </>
    ),
    'Create NFT': (
      <>
        {!uploadsConfigured && (
          <p role="status" className="mb-4 text-amber-300">
            Set both Cloudinary upload presets in .env.local.
          </p>
        )}
        <CreateNFT
          key={walletKey}
          {...wallet}
          onCreate={uploadsConfigured ? createArtwork : undefined}
        />
      </>
    ),
    'My Collection': (
      <MyCollection
        key={walletKey}
        {...wallet}
        {...catalog}
        onList={(tokenId, priceWei) => transact(listNFT, tokenId, priceWei)}
      />
    ),
    'My Listings': (
      <MyListings
        key={walletKey}
        {...wallet}
        {...catalog}
        {...balances?.proceeds}
        onUpdatePrice={(id, priceWei) => transact(updatePrice, id, priceWei)}
        onCancelListing={(id) => transact(cancelListing, id)}
        onWithdraw={() => transact(withdraw)}
      />
    ),
    Profile: (
      <Profile {...wallet} {...catalog} balanceEth={balances?.balanceEth} />
    ),
  };

  const activePage = page === 'Artwork Detail' ? detail?.from : page;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <button
            type="button"
            onClick={() => setPage('Home')}
            className="text-xl font-semibold"
          >
            Eikonium
          </button>

          <nav aria-label="Main navigation" className="eikonium-nav flex flex-wrap gap-1">
            {pages.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setPage(name)}
                aria-current={activePage === name ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 text-sm ${
                  activePage === name
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {name}
              </button>
            ))}
          </nav>

          {account && onSepolia ? (
            <span
              title={account}
              className="eikonium-wallet font-mono text-sm text-emerald-300"
            >
              {account.slice(0, 6)}…{account.slice(-4)}
            </span>
          ) : (
            <button
              type="button"
              onClick={connectWallet}
              disabled={walletBusy}
              className="eikonium-wallet rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
            >
              {walletBusy
                ? 'Check MetaMask…'
                : wrongNetwork
                  ? 'Switch to Sepolia'
                  : 'Connect Wallet'}
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        {walletMessage && (
          <p role="status" className="mb-4 text-amber-300">{walletMessage}</p>
        )}

        {balances?.error && (page === 'Profile' || page === 'My Listings') && (
          <p role="status" className="mb-4 text-amber-300">
            Could not load all wallet balances.
          </p>
        )}

        {views[page]}
      </main>
    </div>
  );
}