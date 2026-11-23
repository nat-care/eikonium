import {
  decodeFunctionResult,
  encodeFunctionData,
  encodeEventTopics,
  formatEther,
  parseAbi,
  toHex,
} from 'viem';

export const CONTRACT_ADDRESS =
  '0x73d473bfeb50c5b8c35ef89436aff77ecbc60e00';

const SEPOLIA_CHAIN_ID = '0xaa36a7';
const ACTIVE_LISTING = 1n;
const BATCH_SIZE = 8;

const abi = parseAbi([
  'function totalMinted() view returns (uint256)',
  'function listingCount() view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function getListing(uint256 listingId) view returns ((address seller, uint96 price, uint256 tokenId, uint8 status))',
  'function pendingWithdrawals(address seller) view returns (uint256)',
  'function mintNFT(string metadataURI) returns (uint256)',
  'function listNFT(uint256 tokenId, uint96 price) returns (uint256)',
  'function buyNFT(uint256 listingId) payable',
  'function updatePrice(uint256 listingId, uint96 price)',
  'function cancelListing(uint256 listingId)',
  'function withdraw()',
  'event NFTMinted(uint256 indexed tokenId, address indexed creator)',
]);

async function getSepoliaProvider() {
  const provider = window.ethereum;

  if (!provider) {
    throw new Error('Install MetaMask to access Eikonium.');
  }

  const chainId = await provider.request({ method: 'eth_chainId' });

  if (chainId !== SEPOLIA_CHAIN_ID) {
    throw new Error('Switch MetaMask to Sepolia.');
  }

  return provider;
}

async function read(provider, functionName, args = [], block = 'latest') {
  const data = encodeFunctionData({ abi, functionName, args });
  const result = await provider.request({
    method: 'eth_call',
    params: [{ to: CONTRACT_ADDRESS, data }, block],
  });

  if (result === '0x') {
    throw new Error('No contract response at the Eikonium address on Sepolia.');
  }

  return decodeFunctionResult({ abi, functionName, data: result });
}

async function waitForReceipt(provider, hash) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const receipt = await provider.request({
      method: 'eth_getTransactionReceipt',
      params: [hash],
    });

    if (receipt) {
      if (receipt.status !== '0x1') {
        throw new Error(`Transaction reverted. Hash ${hash}`);
      }

      return receipt;
    }

    await new Promise((resolve) => setTimeout(resolve, 2_000));
    const chainId = await provider.request({ method: 'eth_chainId' });

    if (chainId !== SEPOLIA_CHAIN_ID) {
      throw new Error(`Switch back to Sepolia to check transaction ${hash}.`);
    }
  }

  throw new Error(
    `Confirmation is still pending. Check transaction ${hash} before retrying.`,
  );
}

async function send(functionName, args = [], value) {
  const provider = await getSepoliaProvider();
  const [from] = await provider.request({ method: 'eth_accounts' });

  if (!from) {
    throw new Error('Connect MetaMask first.');
  }

  const transaction = {
    from,
    to: CONTRACT_ADDRESS,
    data: encodeFunctionData({ abi, functionName, args }),
  };

  if (value !== undefined) {
    transaction.value = toHex(BigInt(value));
  }

  const hash = await provider.request({
    method: 'eth_sendTransaction',
    params: [transaction],
  });

  return waitForReceipt(provider, hash);
}

async function readInBatches(count, callback) {
  const results = [];

  for (let start = 1n; start <= count; start += BigInt(BATCH_SIZE)) {
    const batch = [];

    for (let offset = 0n; offset < BigInt(BATCH_SIZE); offset += 1n) {
      const id = start + offset;
      if (id > count) break;
      batch.push(callback(id));
    }

    results.push(...await Promise.all(batch));
  }

  return results;
}

function resolveMetadataURL(uri) {
  if (uri.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${uri.slice(7).replace(/^ipfs\//, '')}`;
  }

  return uri;
}

async function loadMetadata(uri) {
  try {
    const url = resolveMetadataURL(uri);
    if (!/^https?:\/\//i.test(url)) return {};

    const response = await fetch(url, {
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) return {};

    const metadata = await response.json();

    return {
      name: typeof metadata?.name === 'string' ? metadata.name : '',
      description:
        typeof metadata?.description === 'string' ? metadata.description : '',
      image:
        typeof metadata?.image === 'string'
          ? resolveMetadataURL(metadata.image)
          : '',
    };
  } catch {
    return {};
  }
}

async function loadCreators(provider, block) {
  const firstBlock = import.meta.env.VITE_EIKONIUM_DEPLOY_BLOCK;

  if (!firstBlock) return new Map();

  const creators = new Map();
  const topics = encodeEventTopics({ abi, eventName: 'NFTMinted' });
  const end = BigInt(block);
  const range = 2_000n;

  for (let start = BigInt(firstBlock); start <= end; start += range) {
    const last = start + range - 1n;

    const logs = await provider.request({
      method: 'eth_getLogs',
      params: [{
        address: CONTRACT_ADDRESS,
        fromBlock: toHex(start),
        toBlock: toHex(last > end ? end : last),
        topics,
      }],
    });

    for (const log of logs) {
      const tokenId = BigInt(log.topics[1]).toString();
      creators.set(tokenId, `0x${log.topics[2].slice(-40)}`);
    }
  }

  return creators;
}

export async function getArtworks() {
  const provider = await getSepoliaProvider();
  const block = await provider.request({ method: 'eth_blockNumber' });

  const [tokenCount, listingCount, creators] = await Promise.all([
    read(provider, 'totalMinted', [], block),
    read(provider, 'listingCount', [], block),
    loadCreators(provider, block),
  ]);

  const listings = await readInBatches(listingCount, async (id) => ({
    ...await read(provider, 'getListing', [id], block),
    listingId: id.toString(),
  }));

  const activeListings = new Map(
    listings
      .filter((listing) => BigInt(listing.status) === ACTIVE_LISTING)
      .map((listing) => [listing.tokenId.toString(), listing]),
  );

  return readInBatches(tokenCount, async (id) => {
    const tokenId = id.toString();
    const [owner, uri] = await Promise.all([
      read(provider, 'ownerOf', [id], block),
      read(provider, 'tokenURI', [id], block),
    ]);

    const metadata = await loadMetadata(uri);
    const listing = activeListings.get(tokenId);

    return {
      ...metadata,
      tokenId,
      owner,
      creator: creators.get(tokenId),
      isForSale: Boolean(listing),
      listingId: listing?.listingId,
      seller: listing?.seller,
      priceWei: listing?.price,
      priceEth: listing ? formatEther(listing.price) : undefined,
    };
  });
}

export async function getWalletBalance(account) {
  const provider = await getSepoliaProvider();
  const balance = await provider.request({
    method: 'eth_getBalance',
    params: [account, 'latest'],
  });

  return formatEther(BigInt(balance));
}

export async function getProceeds(account) {
  const provider = await getSepoliaProvider();
  const amount = await read(provider, 'pendingWithdrawals', [account]);

  return {
    proceedsEth: formatEther(amount),
    hasProceeds: amount > 0n,
  };
}

export function mintNFT(metadataURI) {
  return send('mintNFT', [metadataURI]);
}

export function listNFT(tokenId, priceWei) {
  return send('listNFT', [BigInt(tokenId), BigInt(priceWei)]);
}

export function buyNFT(listingId, priceWei) {
  return send('buyNFT', [BigInt(listingId)], priceWei);
}

export function updatePrice(listingId, priceWei) {
  return send('updatePrice', [BigInt(listingId), BigInt(priceWei)]);
}

export function cancelListing(listingId) {
  return send('cancelListing', [BigInt(listingId)]);
}

export function withdraw() {
  return send('withdraw');
}