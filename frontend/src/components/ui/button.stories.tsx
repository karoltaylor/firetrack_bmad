import type { Meta, StoryObj } from "@storybook/react"
import { Search } from "lucide-react"

import { Button } from "./button"

const meta = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: {
    a11y: {
      config: {
        rules: [{ id: "color-contrast", enabled: true }],
      },
    },
  },
  args: {
    children: "Button",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon", "icon-sm", "icon-lg"],
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    variant: "default",
    size: "default",
  },
}

export const Destructive: Story = {
  args: {
    variant: "destructive",
  },
}

export const Outline: Story = {
  args: {
    variant: "outline",
  },
}

export const Secondary: Story = {
  args: {
    variant: "secondary",
  },
}

export const Ghost: Story = {
  args: {
    variant: "ghost",
  },
}

export const Link: Story = {
  args: {
    variant: "link",
  },
}

export const Small: Story = {
  args: {
    size: "sm",
  },
}

export const Large: Story = {
  args: {
    size: "lg",
  },
}

export const Icon: Story = {
  args: {
    size: "icon",
    "aria-label": "Search",
    children: <Search aria-hidden="true" />,
  },
}

export const IconSmall: Story = {
  args: {
    size: "icon-sm",
    "aria-label": "Search",
    children: <Search aria-hidden="true" />,
  },
}

export const IconLarge: Story = {
  args: {
    size: "icon-lg",
    "aria-label": "Search",
    children: <Search aria-hidden="true" />,
  },
}
