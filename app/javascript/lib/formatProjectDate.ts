// Project activity dates must render identically in Node SSR and the browser.
export function formatProjectDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', { timeZone: 'UTC' });
}
