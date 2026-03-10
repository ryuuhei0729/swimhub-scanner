import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@swimhub-scanner/shared", "@swimhub-scanner/i18n"],
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
