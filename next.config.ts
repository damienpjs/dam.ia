import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Plafonne la taille du body bufferisé par le proxy (anti-spam / mémoire).
    // Les payloads chat/feedback sont minuscules ; 64 ko laisse une large marge.
    proxyClientMaxBodySize: "64kb",
  },
};

export default nextConfig;
