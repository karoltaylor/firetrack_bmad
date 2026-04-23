# Image Asset Strategy

- Keep icons, logos, and decorative illustrations in SVG format by default.
- Use raster formats only for photography-like content.
- For each raster image variant, keep siblings with the same basename:
  - `name-<width>.avif` (primary)
  - `name-<width>.webp` (fallback)
  - optional baseline fallback (`.jpg` or `.png`) when needed for legacy behavior
- Keep brand assets under `brand/` and use `-light` suffixes for dark-surface variants.
