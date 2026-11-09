import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin"
import type { NextConfig } from "next"

const withVarlock = varlockNextConfigPlugin()

// Hostname of this machine on the tailnet (from .env.schema), so the dev
// server accepts requests proxied by `tailscale serve`.
const tailnetHost = process.env.TAILSCALE_URL
  ? new URL(process.env.TAILSCALE_URL).hostname
  : undefined

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/auth", "@workspace/db"],
  serverExternalPackages: ["postgres"],
  allowedDevOrigins: tailnetHost ? [tailnetHost] : [],
}

export default withVarlock(nextConfig)
