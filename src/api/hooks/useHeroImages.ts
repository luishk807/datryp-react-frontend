import { useQuery } from '@tanstack/react-query';
import { fetchHeroImages } from 'api/heroImagesApi';
import type { HeroImage } from 'types';

/**
 * Rotating homepage heroes (city photos rehosted on S3, refreshed by the
 * backend's `seed_hero_images` script / future cron).
 *
 * Cached for an hour — the underlying dataset only changes when the cron
 * (or a manual seed run) refreshes it.
 */
export const useHeroImages = () =>
    useQuery<HeroImage[]>({
        queryKey: ['hero-images'],
        queryFn: fetchHeroImages,
        staleTime: 60 * 60 * 1000,
        // Don't bombard the page with retries if the backend is down — fall
        // back to local sample images and move on.
        retry: 1,
    });
