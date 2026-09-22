export const fixImageUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (url.startsWith("/media/")) {
    return `https://narendra-kirana.onrender.com${url}`;
  }
  if (url.startsWith("media/")) {
    return `https://narendra-kirana.onrender.com/${url}`;
  }
  return `https://narendra-kirana.onrender.com/media/${url}`;
};

/**
 * Returns a dynamically resized and compressed image URL for mobile screens.
 * Uses Cloudinary dynamic transformation parameters (w_320,h_320,c_limit,q_auto,f_auto)
 * to reduce bandwidth usage by up to 95% on mobile devices while keeping image crisp.
 */
export const getOptimizedImageUrl = (
  url: string | null | undefined,
  width: number = 320,
  height: number = 320,
): string => {
  const fixed = fixImageUrl(url);
  if (!fixed) return "";

  if (fixed.includes("res.cloudinary.com") && fixed.includes("/upload/")) {
    // Inject responsive width, height, limit crop, auto quality, and auto WebP/AVIF format
    return fixed.replace(
      "/upload/",
      `/upload/w_${width},h_${height},c_limit,q_auto,f_auto/`,
    );
  }

  return fixed;
};
