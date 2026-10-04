const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
      "#onnxruntime-webgpu": path.resolve(
        __dirname,
        "node_modules/@huggingface/transformers/node_modules/onnxruntime-web/dist/ort.webgpu.bundle.min.mjs"
      ),
      "onnxruntime-web$": path.resolve(
        __dirname,
        "node_modules/@huggingface/transformers/node_modules/onnxruntime-web/dist/ort.webgpu.bundle.min.mjs"
      ),
      "@huggingface/transformers": require.resolve("@huggingface/transformers"),
    };
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'shinobi.bulelengkab.go.id',
      },
    ],
  },
};

module.exports = nextConfig;
