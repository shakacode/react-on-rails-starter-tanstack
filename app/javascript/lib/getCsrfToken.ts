export const getCsrfToken = () => {
  if (typeof document === 'undefined') return null;

  return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? null;
};
