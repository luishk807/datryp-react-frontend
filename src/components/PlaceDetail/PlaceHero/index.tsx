import { useEffect, useMemo, useState } from "react";
import classNames from "classnames";
import { usePhotoGallery } from "api/hooks/usePhotoSearch";
import "./index.scss";

export interface PlaceHeroProps {
  /** Place name — used for the `alt` text on the photo and as the
   *  `aria-label` when only the placeholder logo is shown. */
  name: string;
  /** Unsplash photo URL. When missing/empty the hero renders the gray
   *  DaTryp.com logo placeholder. */
  imageUrl?: string | null;
  /** Unsplash photographer name — only rendered when `imageUrl` is set. */
  photographerName?: string | null;
  /** Unsplash photographer profile URL. When present the name links to it. */
  photographerUrl?: string | null;
  /** Optional extra class for the wrapper (e.g. a parent layout grid that
   *  needs to override `aspect-ratio` to stretch the hero). */
  className?: string;
  /** When set, fetch a few more Unsplash photos for this query and show a
   *  thumbnail gallery overlaid on the hero — one main image plus up to
   *  three more, click/tap a thumbnail to make it the main. A single
   *  Unsplash request, so it costs the same as the one-image hero. Leave
   *  unset to keep the plain single-image hero. */
  galleryQuery?: string;
}

interface HeroImage {
  url: string;
  photographerName?: string | null;
  photographerUrl?: string | null;
}

/**
 * The big rounded-corner photo at the top of the place-detail page.
 * Falls back to a centered DaTryp.com logo when no image URL is available,
 * and overlays the Unsplash photo attribution in the bottom-right.
 *
 * With `galleryQuery`, it becomes a small gallery: the main photo plus a
 * tap-to-swap thumbnail strip (up to 4 images total), sourced from one
 * Unsplash search. Mobile-friendly — the thumbnails shrink and stay a
 * single tappable row.
 */
const PlaceHero = ({
  name,
  imageUrl,
  photographerName,
  photographerUrl,
  className,
  galleryQuery,
}: PlaceHeroProps) => {
  const { data: galleryPhotos } = usePhotoGallery(galleryQuery ?? "", 4, {
    enabled: Boolean(galleryQuery?.trim()),
  });

  // Main image first (from the cache/recommender), then the fresh Unsplash
  // extras — deduped by URL and capped at 4 so the strip stays tidy.
  const images = useMemo<HeroImage[]>(() => {
    const list: HeroImage[] = [];
    const seen = new Set<string>();
    const push = (img: HeroImage) => {
      if (!img.url || seen.has(img.url)) return;
      seen.add(img.url);
      list.push(img);
    };
    if (imageUrl) {
      push({ url: imageUrl, photographerName, photographerUrl });
    }
    for (const p of galleryPhotos ?? []) {
      push({
        url: p.imageUrl,
        photographerName: p.photographerName,
        photographerUrl: p.photographerUrl,
      });
    }
    return list.slice(0, 4);
  }, [imageUrl, photographerName, photographerUrl, galleryPhotos]);

  // Reset the selection when the place (or its primary image) changes so a
  // reused component instance doesn't carry a stale index to a new place.
  const [selectedIdx, setSelectedIdx] = useState(0);
  useEffect(() => {
    setSelectedIdx(0);
  }, [galleryQuery, imageUrl]);

  const safeIdx = selectedIdx < images.length ? selectedIdx : 0;
  const main = images[safeIdx];
  const isPlaceholder = !main;
  const hasAttribution = !isPlaceholder && Boolean(main.photographerName);
  const hasGallery = images.length > 1;

  return (
    <div
      className={classNames(
        "place-hero",
        { "is-placeholder": isPlaceholder },
        className,
      )}
      role={isPlaceholder ? "img" : undefined}
      aria-label={isPlaceholder ? name : undefined}
    >
      {!isPlaceholder && <img src={main.url} alt={name} />}

      {hasGallery && (
        <div
          className="place-hero-thumbs"
          role="tablist"
          aria-label={`${name} photos`}
        >
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              role="tab"
              aria-selected={i === safeIdx}
              aria-label={`Show photo ${i + 1} of ${images.length}`}
              className={classNames("place-hero-thumb", {
                "is-active": i === safeIdx,
              })}
              onClick={() => setSelectedIdx(i)}
            >
              <img src={img.url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {hasAttribution && (
        <span className="place-hero-attribution">
          Photo by{" "}
          {main.photographerUrl ? (
            <a
              href={main.photographerUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {main.photographerName}
            </a>
          ) : (
            main.photographerName
          )}{" "}
          on{" "}
          <a
            href="https://unsplash.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Unsplash
          </a>
        </span>
      )}
    </div>
  );
};

export default PlaceHero;
