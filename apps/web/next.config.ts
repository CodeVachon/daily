import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin"
import type { NextConfig } from "next"
import { fileURLToPath } from "node:url"

import { ENV } from "./env"

// Resolve the env when the server boots (`varlock run -- node server.js` in the
// image), from the container's env file; nothing is baked into the build.
const withVarlock = varlockNextConfigPlugin({ freezeIntoBundle: false })

// Hostname of this machine on the tailnet (from .env.schema), so the dev
// server accepts requests proxied by `tailscale serve`.
const tailnetHost = ENV.TAILSCALE_URL
  ? new URL(ENV.TAILSCALE_URL).hostname
  : undefined

const nextConfig: NextConfig = {
  // Self-contained server for the production Docker image (see Dockerfile).
  output: "standalone",
  // Monorepo: trace workspace packages from the repo root.
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
  transpilePackages: [
    "@workspace/ui",
    "@workspace/auth",
    "@workspace/db",
    "@workspace/mcp",
    "@workspace/integrations",
  ],
  serverExternalPackages: ["postgres"],
  allowedDevOrigins: tailnetHost ? [tailnetHost] : [],
}

export default withVarlock(nextConfig)
