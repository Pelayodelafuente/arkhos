export async function fetchFREDSeries(
  seriesId: string,
  limit = 60
): Promise<Array<{ date: string; value: number }>> {
  const url = new URL('https://api.stlouisfed.org/fred/series/observations');
  url.searchParams.set('series_id', seriesId);
  url.searchParams.set('api_key', process.env.FRED_API_KEY!);
  url.searchParams.set('file_type', 'json');
  url.searchParams.set('sort_order', 'desc');
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`FRED error ${res.status} for ${seriesId}`);

  const json = (await res.json()) as {
    observations: Array<{ date: string; value: string }>;
  };
  return json.observations
    .filter((o) => o.value !== '.')
    .map((o) => ({ date: o.date, value: parseFloat(o.value) }))
    .reverse();
}
