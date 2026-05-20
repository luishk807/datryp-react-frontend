import { useEffect, useState } from 'react';

/**
 * True once the page has been scrolled past `threshold` pixels from
 * the top. Drives "scroll-activated" UI chrome — e.g., the detail-page
 * toolbar grows a translucent background + drop shadow once the user
 * starts scrolling down, and reverts to a flat in-flow look when they
 * scroll back to the top.
 *
 * Implemented with a passive scroll listener (instead of an
 * IntersectionObserver sentinel) so the activation point is decoupled
 * from any specific element's position — the only thing that matters
 * is "has the user scrolled at all". Threshold defaults to 16px so a
 * single jittery wheel-click doesn't toggle the chrome on.
 */
export const useIsStuck = (threshold = 16): boolean => {
    const [scrolled, setScrolled] = useState<boolean>(() =>
        typeof window !== 'undefined' ? window.scrollY > threshold : false
    );

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > threshold);
        // Sync once on mount in case the page already opened mid-scroll
        // (browser-restored scroll position on a back-nav, anchor link
        // landing, etc.).
        handler();
        window.addEventListener('scroll', handler, { passive: true });
        return () => window.removeEventListener('scroll', handler);
    }, [threshold]);

    return scrolled;
};
