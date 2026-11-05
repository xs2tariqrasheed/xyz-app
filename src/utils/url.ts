/**
 * The value when it is an absolute http(s) URL, else ''. For URLs read from
 * `.env`, where a typo should hide a link rather than open a broken page.
 */
export function absoluteHttpUrl(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  try {
    const { protocol } = new URL(trimmed);
    return protocol === 'https:' || protocol === 'http:' ? trimmed : '';
  } catch {
    return '';
  }
}
