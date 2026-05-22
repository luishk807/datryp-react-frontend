import classNames from "classnames";
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
}

/**
 * The big rounded-corner photo at the top of the place-detail page.
 * Falls back to a centered DaTryp.com logo when no image URL is available,
 * and overlays the Unsplash photo attribution in the bottom-right.
 */
const PlaceHero = ({
  name,
  imageUrl,
  photographerName,
  photographerUrl,
  className,
}: PlaceHeroProps) => {
  const isPlaceholder = !imageUrl;
  const hasAttribution = !isPlaceholder && photographerName;

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
      {!isPlaceholder && <img src={imageUrl as string} alt={name} />}
      {hasAttribution && (
        <span className="place-hero-attribution">
          Photo by{" "}
          {photographerUrl ? (
            <a
              href={photographerUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {photographerName}
            </a>
          ) : (
            photographerName
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
