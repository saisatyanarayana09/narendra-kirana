import { fixImageUrl, getOptimizedImageUrl } from "./image";

describe("Image Utils", () => {
  describe("fixImageUrl", () => {
    it("returns empty string for null/undefined", () => {
      expect(fixImageUrl(null)).toBe("");
      expect(fixImageUrl(undefined)).toBe("");
      expect(fixImageUrl("")).toBe("");
    });

    it("returns absolute URLs untouched", () => {
      expect(fixImageUrl("https://example.com/img.jpg")).toBe(
        "https://example.com/img.jpg",
      );
    });

    it("prepends backend URL to relative paths", () => {
      expect(fixImageUrl("/media/products/img.jpg")).toBe(
        "https://narendra-kirana.onrender.com/media/products/img.jpg",
      );
      expect(fixImageUrl("media/products/img.jpg")).toBe(
        "https://narendra-kirana.onrender.com/media/products/img.jpg",
      );
      expect(fixImageUrl("products/img.jpg")).toBe(
        "https://narendra-kirana.onrender.com/media/products/img.jpg",
      );
    });
  });

  describe("getOptimizedImageUrl", () => {
    it("adds cloudinary transformations", () => {
      const cloudUrl =
        "https://res.cloudinary.com/demo/image/upload/v1234/sample.jpg";
      const expected =
        "https://res.cloudinary.com/demo/image/upload/w_320,h_320,c_limit,q_auto,f_auto/v1234/sample.jpg";
      expect(getOptimizedImageUrl(cloudUrl)).toBe(expected);
    });

    it("returns original url if not cloudinary", () => {
      const standardUrl = "https://example.com/img.jpg";
      expect(getOptimizedImageUrl(standardUrl)).toBe(standardUrl);
    });
  });
});
