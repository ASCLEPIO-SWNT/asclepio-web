/** Only operational filters travel between the tray and capture; never clinical drafts. */
export function trayFilters(params: URLSearchParams) {
  const rawOffset = params.get('offset') ?? '';
  const parsed = /^\d+$/.test(rawOffset) ? Number(rawOffset) : 0;
  return {
    siteId: params.get('siteId') || null,
    offset: Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0,
  };
}

export function traySearch(siteId: string | null, offset: number) {
  const params = new URLSearchParams();
  if (siteId) params.set('siteId', siteId);
  params.set('offset', String(offset));
  return params.toString();
}
