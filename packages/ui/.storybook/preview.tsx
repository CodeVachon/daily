import { withThemeByClassName } from "@storybook/addon-themes"
import type { Preview, ReactRenderer } from "@storybook/react-vite"

import { TooltipProvider } from "@workspace/ui/components/tooltip"
import "../src/styles/globals.css"

const preview: Preview = {
  parameters: {
    layout: "centered",
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: { test: "error" },
  },
  tags: ["autodocs"],
  decorators: [
    withThemeByClassName<ReactRenderer>({
      themes: { light: "", dark: "dark" },
      defaultTheme: "light",
    }),
    (Story) => (
      <TooltipProvider>
        <div className="bg-background p-6 font-sans text-foreground">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
}

export default preview
