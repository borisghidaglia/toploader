import { formatPrice } from "@/lib/cards";
import { cn } from "@/lib/utils";

/** The fluoro price-gun sticker slapped on every toploader. */
export function PriceSticker({
  price,
  size = "sm",
  className,
}: {
  price: number;
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "price-sticker inline-flex items-center font-display font-black leading-none tabular-nums text-sticker-ink",
        size === "sm" ? "px-2 py-1.5 text-[15px]" : "px-3.5 py-2.5 text-[26px]",
        className,
      )}
    >
      {formatPrice(price)}
    </span>
  );
}
