import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { NamedTip } from 'types';

let mockUser: { isPaidMember: boolean } | null = null;
let mockIsAdmin = false;
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser, isAdmin: mockIsAdmin }),
}));

import ExperienceHighlights from './index';

const tip = (over: Partial<NamedTip> = {}): NamedTip => ({
    name: 'Tokyo Tower',
    why: 'City views at dusk',
    imageUrl: 'https://img.example/tower.jpg',
    ...over,
});

beforeEach(() => {
    mockUser = null;
    mockIsAdmin = false;
});

describe('ExperienceHighlights', () => {
    it('renders nothing for a non-Pro, non-admin user', () => {
        mockUser = null;
        const { container } = renderWithProviders(
            <ExperienceHighlights things={[tip()]} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing for a Pro user with no things', () => {
        mockUser = { isPaidMember: true };
        const { container } = renderWithProviders(
            <ExperienceHighlights things={undefined} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when no thing carries an enriched image', () => {
        mockUser = { isPaidMember: true };
        const { container } = renderWithProviders(
            <ExperienceHighlights things={[tip({ imageUrl: null })]} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the strip for a Pro user, imaged items only', () => {
        mockUser = { isPaidMember: true };
        renderWithProviders(
            <ExperienceHighlights
                things={[
                    tip(),
                    tip({ name: 'No Photo', imageUrl: null }),
                    tip({ name: 'Shibuya Crossing', why: 'The scramble' }),
                ]}
            />
        );

        expect(
            screen.getByRole('region', { name: 'Experience highlights' })
        ).toBeInTheDocument();
        expect(screen.getByText(/Don.t miss/)).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Signature things to do' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('img', { name: 'Tokyo Tower' })
        ).toBeInTheDocument();
        expect(screen.getByText('City views at dusk')).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Shibuya Crossing' })
        ).toBeInTheDocument();
        // The image-less item is filtered out.
        expect(screen.queryByText('No Photo')).not.toBeInTheDocument();
    });

    it('renders for an admin even without a paid plan', () => {
        mockUser = { isPaidMember: false };
        mockIsAdmin = true;
        renderWithProviders(<ExperienceHighlights things={[tip()]} />);
        expect(
            screen.getByRole('region', { name: 'Experience highlights' })
        ).toBeInTheDocument();
    });

    it('renders the Unsplash attribution when photographer data is present', () => {
        mockUser = { isPaidMember: true };
        renderWithProviders(
            <ExperienceHighlights
                things={[
                    tip({
                        photographerName: 'Ansel',
                        photographerUrl: 'https://unsplash.com/@ansel',
                    }),
                ]}
            />
        );
        expect(
            screen.getByRole('link', { name: 'Unsplash' })
        ).toBeInTheDocument();
    });
});
