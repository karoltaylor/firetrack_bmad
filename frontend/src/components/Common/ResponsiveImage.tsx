import type { ImgHTMLAttributes } from "react"

/**
 * SVG-first asset policy:
 * - Use SVG for icons, logos, and decorative illustrations.
 * - Use this component only for photographic content that needs raster formats.
 * - Provide AVIF srcset first, WebP fallback second, and a baseline img fallback.
 */
type ResponsiveImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet" | "sizes" | "width" | "height"
> & {
  alt: string
  avifSrcSet: string
  webpSrcSet: string
  fallbackSrc: string
  sizes: string
  width: number
  height: number
}

export function ResponsiveImage({
  alt,
  avifSrcSet,
  webpSrcSet,
  fallbackSrc,
  sizes,
  width,
  height,
  loading = "lazy",
  decoding = "async",
  ...imageProps
}: ResponsiveImageProps) {
  return (
    <picture>
      <source type="image/avif" srcSet={avifSrcSet} sizes={sizes} />
      <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} />
      <img
        src={fallbackSrc}
        alt={alt}
        sizes={sizes}
        width={width}
        height={height}
        loading={loading}
        decoding={decoding}
        {...imageProps}
      />
    </picture>
  )
}
