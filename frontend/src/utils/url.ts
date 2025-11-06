export const buildAppPath = (path: string = '/'): string => {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase =
    base === '/' || base === '' ? '' : base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const combined = `${normalizedBase}${normalizedPath}`;
  return combined || '/';
};
