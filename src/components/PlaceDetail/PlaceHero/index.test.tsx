import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { PhotoSearchResult } from 'api/photoSearchApi';

let mockGallery: PhotoSearchResult[] | undefined;
vi.mock('api/hooks/usePhotoSearch', () => ({
    usePhotoGallery: () => ({ data: mockGallery }),
}));

import PlaceHero from './index';

beforeEach(() => {
    mockGallery = undefined;
});

describe('PlaceHero', () => {
    it('renders the photo with the place name as alt text', () => {
        renderWithProviders(
            <PlaceHero name="Kyoto" imageUrl="https://img.example/kyoto.jpg" />
        );
        const img = screen.getByRole('img', { name: 'Kyoto' });
        expect(img).toHaveAttribute('src', 'https://img.example/kyoto.jpg');
    });

    it('renders the photographer attribution with a link', () => {
        renderWithProviders(
            <PlaceHero
                name="Kyoto"
                imageUrl="https://img.example/kyoto.jpg"
                photographerName="Ansel"
                photographerUrl="https://unsplash.com/@ansel"
            />
        );
        expect(screen.getByText(/photo by/i)).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Ansel' })
        ).toHaveAttribute('href', 'https://unsplash.com/@ansel');
    });

    it('renders the attribution name as plain text when no photographer URL is set', () => {
        renderWithProviders(
            <PlaceHero
                name="Kyoto"
                imageUrl="https://img.example/kyoto.jpg"
                photographerName="Ansel"
                photographerUrl={null}
            />
        );
        expect(screen.getByText(/photo by/i)).toBeInTheDocument();
        expect(screen.getByText('Ansel')).toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'Ansel' })
        ).not.toBeInTheDocument();
    });

    it('renders the placeholder with an accessible name when no image is available', () => {
        renderWithProviders(<PlaceHero name="Kyoto" imageUrl={null} />);
        expect(screen.getByRole('img', { name: 'Kyoto' })).toBeInTheDocument();
        // No real <img> element is rendered in the placeholder branch.
        expect(document.querySelector('img')).toBeNull();
    });

    it('renders a tab-list gallery and swaps the main image on tab click', async () => {
        mockGallery = [
            {
                imageUrl: 'https://img.example/a.jpg',
                photographerName: null,
                photographerUrl: null,
            },
            {
                imageUrl: 'https://img.example/b.jpg',
                photographerName: null,
                photographerUrl: null,
            },
        ];
        renderWithProviders(
            <PlaceHero
                name="Kyoto"
                imageUrl="https://img.example/main.jpg"
                galleryQuery="Kyoto"
            />
        );
        const tabs = screen.getAllByRole('tab');
        expect(tabs.length).toBe(3);
        expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
        // Main image starts on the primary hero photo.
        expect(screen.getByRole('img', { name: 'Kyoto' })).toHaveAttribute(
            'src',
            'https://img.example/main.jpg'
        );

        await userEvent.click(tabs[1]);
        expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('img', { name: 'Kyoto' })).toHaveAttribute(
            'src',
            'https://img.example/a.jpg'
        );
    });
});
