import { fetchWithTimeout } from '@/lib/utils/fetch-timeout';
import { createHash, createHmac } from 'crypto';

const BIT2ME_BASE_URL = 'https://gateway.bit2me.com';

function buildHeaders(path: string): Record<string, string> {
  const apiKey = process.env.BIT2ME_API_KEY;
  const apiSecret = process.env.BIT2ME_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('BIT2ME_API_KEY and BIT2ME_API_SECRET are required');
  }

  const nonce = Date.now().toString();
  const message = `${nonce}:${path}`;
  const sha256Digest = createHash('sha256').update(message).digest();
  const signature = createHmac('sha512', apiSecret)
    .update(sha256Digest)
    .digest('base64');

  return {
    'x-api-key': apiKey,
    'api-signature': signature,
    'x-nonce': nonce,
    Accept: 'application/json',
  };
}

export async function bit2meGet<T>(path: string): Promise<T> {
  const headers = buildHeaders(path);
  const response = await fetchWithTimeout(`${BIT2ME_BASE_URL}${path}`, { headers });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Bit2Me API error ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export interface Bit2MePocket {
  currency: string;
  balance: string;
}

export interface Bit2MeRate {
  value: string;
  pair: {
    base: string;
    quote: string;
  };
}

export interface Bit2MeLeg {
  currency: string;
  amount: string;
  class: string;
  address?: string;
  rate?: Bit2MeRate;
}

export interface Bit2MeTransaction {
  id: string;
  date: string;
  type: string;
  subtype?: string;
  method?: string;
  status: string;
  origin: Bit2MeLeg;
  destination: Bit2MeLeg;
}

export interface Bit2MeTransactionPage {
  total: number;
  data: Bit2MeTransaction[];
}

export async function fetchAllTransactions(): Promise<Bit2MeTransaction[]> {
  const limit = 50;
  let offset = 0;
  const all: Bit2MeTransaction[] = [];

  const first = await bit2meGet<Bit2MeTransactionPage>(
    `/v2/wallet/transaction?limit=${limit}&offset=${offset}`,
  );
  all.push(...first.data);
  offset += first.data.length;

  while (offset < first.total) {
    const page = await bit2meGet<Bit2MeTransactionPage>(
      `/v2/wallet/transaction?limit=${limit}&offset=${offset}`,
    );
    all.push(...page.data);
    offset += page.data.length;
    if (page.data.length === 0) break;
  }

  return all;
}
