import type { StorybookConfig } from "@storybook/react-vite"
import tailwindcss from "@tailwindcss/vite"

/**
 * Storybook for the shared shadcn/ui components in packages/ui.
 *   bun run storybook        (dev server on :6006, MCP at http://localhost:6006/mcp)
 *   bun run storybook:build
 */
const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.stories.@(ts|tsx)", "../src/**/*.mdx"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-themes",
    "@storybook/addon-a11y",
    // Lets coding agents query component docs and stories over MCP.
    "@storybook/addon-mcp",
  ],
  typescript: { reactDocgen: "react-docgen-typescript" },
  core: { disableTelemetry: true },
  async viteFinal(viteConfig) {
    const { mergeConfig } = await import("vite")
    return mergeConfig(viteConfig, { plugins: [tailwindcss()] })
  },
}

export default config
