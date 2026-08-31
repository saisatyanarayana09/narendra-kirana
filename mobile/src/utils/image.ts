export const fixImageUrl = (url: string | undefined) => { if (!url) return url; return url.replace('https://narendra-kirana.onrender.com/media/', 'http://127.0.0.1:8000/media/'); };
