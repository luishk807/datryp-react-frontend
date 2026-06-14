import { usePlaceImage } from 'api/hooks/usePlaceImage';
import { NO_IMAGE } from 'constants';

export interface PlaceThumbProps {
    /** Place / city name — the lookup key for the image fallback. */
    name: string;
    city?: string | null;
    country?: string | null;
    /** Image already known for the place (from the AI payload). When present
     *  it's used as-is; only its absence triggers the fallback lookup. */
    imageUrl?: string | null;
    className?: string;
    alt?: string;
}

/**
 * A place thumbnail that self-heals a missing image. AI-generated place
 * payloads (suggestions, world/country events) sometimes arrive without an
 * `imageUrl` — e.g. the Unsplash enrichment was rate-limited at generate
 * time, which is more likely on a freshly-generated non-English set. Rather
 * than paint the NO_IMAGE placeholder, this resolves a photo by name through
 * the backend's multi-provider, server-cached `/places/image` (`usePlaceImage`),
 * gated so the lookup only fires when there's no image to begin with.
 */
const PlaceThumb = ({
    name,
    city,
    country,
    imageUrl,
    className,
    alt = '',
}: PlaceThumbProps) => {
    const { data } = usePlaceImage(name, city ?? null, country ?? null, {
        enabled: !imageUrl && name.trim().length > 0,
    });
    const src = imageUrl ?? data?.imageUrl ?? NO_IMAGE;
    return <img src={src} alt={alt} loading="lazy" className={className} />;
};

export default PlaceThumb;
