interface BlockstreamAddressStats {
  funded_txo_sum: number;
  spent_txo_sum: number;
}

interface BlockstreamAddressResponse {
  chain_stats: BlockstreamAddressStats;
}

interface EtherscanBalanceResponse {
  status: string;
  result: string;
}

export async function getBTCBalance(address: string): Promise<number | null> {
  try {
    const url = `https://blockstream.info/api/address/${encodeURIComponent(address)}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      console.error(
        `[blockchain] Blockstream HTTP ${response.status} for address ${address}`,
      );
      return null;
    }

    const data = (await response.json()) as BlockstreamAddressResponse;
    const satoshis =
      data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
    return satoshis / 100_000_000;
  } catch (error) {
    console.error('[blockchain] Error fetching BTC balance:', error);
    return null;
  }
}

export async function getETHBalance(address: string): Promise<number | null> {
  try {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (!apiKey) {
      console.error('[blockchain] ETHERSCAN_API_KEY is not set');
      return null;
    }

    const url = new URL('https://api.etherscan.io/v2/api');
    url.searchParams.set('chainid', '1');
    url.searchParams.set('module', 'account');
    url.searchParams.set('action', 'balance');
    url.searchParams.set('address', address);
    url.searchParams.set('tag', 'latest');
    url.searchParams.set('apikey', apiKey);

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      console.error(
        `[blockchain] Etherscan HTTP ${response.status} for ETH balance`,
      );
      return null;
    }

    const data = (await response.json()) as EtherscanBalanceResponse;
    if (data.status !== '1') {
      console.error('[blockchain] Etherscan ETH error:', data.result);
      return null;
    }

    return parseInt(data.result, 10) / 1e18;
  } catch (error) {
    console.error('[blockchain] Error fetching ETH balance:', error);
    return null;
  }
}

export async function getUSDCBalance(address: string): Promise<number | null> {
  try {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (!apiKey) {
      console.error('[blockchain] ETHERSCAN_API_KEY is not set');
      return null;
    }

    const url = new URL('https://api.etherscan.io/v2/api');
    url.searchParams.set('chainid', '1');
    url.searchParams.set('module', 'account');
    url.searchParams.set('action', 'tokenbalance');
    url.searchParams.set(
      'contractaddress',
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    );
    url.searchParams.set('address', address);
    url.searchParams.set('tag', 'latest');
    url.searchParams.set('apikey', apiKey);

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      console.error(
        `[blockchain] Etherscan HTTP ${response.status} for USDC balance`,
      );
      return null;
    }

    const data = (await response.json()) as EtherscanBalanceResponse;
    if (data.status !== '1') {
      console.error('[blockchain] Etherscan USDC error:', data.result);
      return null;
    }

    return parseInt(data.result, 10) / 1e6;
  } catch (error) {
    console.error('[blockchain] Error fetching USDC balance:', error);
    return null;
  }
}
