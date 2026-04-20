import type { LoreImage } from "@/lib/lore-data";

// Renders a real image (from SC Wiki) with a visible credit caption in
// the bottom-right corner. Used wherever LoreImage data is present , 
// chapter heroes, splash panels, race portraits, system banners.
//
// Why plain <img> vs next/image: we're a static export, and the images
// live on a third-party CDN (media.starcitizen.tools). Whitelisting it
// for next/image means extra config for zero performance gain since the
// wiki already serves these heavily cached.

export function LoreImageEl({
  image,
  className,
  style,
  objectFit = "cover",
  position = "center",
  credit = "corner",
}: {
  image: LoreImage;
  className?: string;
  style?: React.CSSProperties;
  objectFit?: "cover" | "contain";
  position?: string;
  // 'corner' = small credit in bottom-right
  // 'bar'    = full-width credit strip under the image
  // 'hidden' = no visible credit (caller handles it)
  credit?: "corner" | "bar" | "hidden";
}) {
  const content = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.src}
        alt={image.alt}
        loading="lazy"
        style={{
          width: "100%",
          height: "100%",
          objectFit,
          objectPosition: position,
          display: "block",
          ...style,
        }}
        className={className}
      />
      {credit === "corner" && <CreditBadge image={image} />}
    </>
  );

  if (credit === "bar") {
    return (
      <>
        {content}
        <CreditBar image={image} />
      </>
    );
  }
  return content;
}

function CreditBadge({ image }: { image: LoreImage }) {
  return (
    <a
      href={image.creditUrl ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      title={`Source: ${image.credit}`}
      style={{
        position: "absolute",
        bottom: 8,
        right: 8,
        zIndex: 2,
        padding: "3px 8px",
        fontSize: "0.65rem",
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.08em",
        color: "rgba(255,255,255,0.82)",
        background: "rgba(2,5,12,0.7)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 3,
        backdropFilter: "blur(4px)",
        textDecoration: "none",
      }}
    >
      📷 {image.credit}
    </a>
  );
}

function CreditBar({ image }: { image: LoreImage }) {
  return (
    <div
      style={{
        padding: "6px 12px",
        fontSize: "0.68rem",
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.08em",
        color: "var(--lore-text-dim)",
        borderTop: "1px solid var(--lore-border)",
        background: "rgba(2,5,12,0.5)",
      }}
    >
      📷 Image:{" "}
      <a
        href={image.creditUrl ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "var(--lore-cyan)", textDecoration: "none" }}
      >
        {image.credit}
      </a>
    </div>
  );
}
