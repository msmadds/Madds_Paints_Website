import Image from "next/image";
import { cn } from "@/lib/utils";

type Img = { url: string; width: number | null; height: number | null; alt: string } | null | undefined;

/**
 * Artwork photograph at its true aspect ratio (never cropped — the whole
 * painting is always shown). Falls back to a neutral mat when no image exists.
 */
export function ArtImage({
  image,
  title,
  sizes,
  priority,
  className,
  hung = true,
  box,
}: {
  image: Img;
  title: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  hung?: boolean;
  /** Hang the work inside a fixed-ratio box, bottom-aligned, so labels line up in grids. */
  box?: string;
}) {
  if (!image) {
    return (
      <div className={cn("flex aspect-[4/5] items-center justify-center bg-plinth text-sm text-stone", className)}>
        Image coming soon
      </div>
    );
  }
  const w = image.width ?? 1600;
  const h = image.height ?? 1200;
  if (box) {
    return (
      <div className={cn("flex items-end justify-center", box)}>
        <Image
          src={image.url}
          alt={image.alt || title}
          width={w}
          height={h}
          sizes={sizes}
          priority={priority}
          quality={90}
          className={cn("h-auto max-h-full w-auto max-w-full bg-plinth", hung && "hung", className)}
        />
      </div>
    );
  }
  return (
    <Image
      src={image.url}
      alt={image.alt || title}
      width={w}
      height={h}
      sizes={sizes}
      priority={priority}
      quality={90}
      className={cn("h-auto w-full bg-plinth", hung && "hung", className)}
    />
  );
}
