/** @type {import('next').NextConfig} */
module.exports = {
  experimental: {
    serverComponentsExternalPackages: [
      "pdf-parse", "mammoth", "firebase-admin", "tesseract.js",
      "sharp", "canvas", "pdfjs-dist", "puppeteer-core", "@sparticuz/chromium",
    ],
  },
  images: {
    remotePatterns: [
      { protocol:"https", hostname:"images.unsplash.com" },
      { protocol:"https", hostname:"firebasestorage.googleapis.com" },
      { protocol:"https", hostname:"lh3.googleusercontent.com" },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle server-only modules on client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, path: false, crypto: false,
      };
    }
    return config;
  },
};
