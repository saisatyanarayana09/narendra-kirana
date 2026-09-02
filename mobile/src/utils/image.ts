export const fixImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('/media/')) {
    return `https://narendra-kirana.onrender.com${url}`;
  }
  if (url.startsWith('media/')) {
    return `https://narendra-kirana.onrender.com/${url}`;
  }
  return `https://narendra-kirana.onrender.com/media/${url}`;
};

