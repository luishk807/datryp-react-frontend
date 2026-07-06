import './index.scss';
import type { ReactNode } from 'react';

export interface DetailFactsGridProps {
    /** The compact "good to know" fact cards — Tap water, Air quality,
     *  Walkability, Internet. Each self-hides (renders null) when it has no
     *  data, and the grid collapses to nothing (`:empty`) when they all do. */
    children: ReactNode;
}

/**
 * A three-column desktop grid (single column on mobile) for the compact fact
 * cards, rendered inline in the main content column just before Essential apps.
 * The cards keep their own `DetailSection` chrome and the same compact sizing
 * they had in the sidebar — this only lays them out side by side.
 */
const DetailFactsGrid = ({ children }: DetailFactsGridProps) => (
    <div className="detail-facts-grid">{children}</div>
);

export default DetailFactsGrid;
