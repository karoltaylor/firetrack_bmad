import { Github, Linkedin, Twitter } from "lucide-react"

const socialLinks = [
  {
    icon: Github,
    href: "https://github.com/firetrack",
    label: "GitHub",
  },
  { icon: Twitter, href: "https://x.com/firetrackapp", label: "X" },
  {
    icon: Linkedin,
    href: "https://linkedin.com/company/firetrack",
    label: "LinkedIn",
  },
]

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t px-6 py-4">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">
            FIREtrack - {currentYear}
          </p>
          <p className="text-muted-foreground text-xs">
            FIREtrack provides informational projections only, not financial
            advice.
          </p>
          <p className="text-muted-foreground text-xs">
            Glossary:{" "}
            <abbr title="Financial Independence, Retire Early">FIRE</abbr> and{" "}
            <abbr title="Safe Withdrawal Rate">SWR</abbr>.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {socialLinks.map(({ icon: Icon, href, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
