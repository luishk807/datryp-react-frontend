import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import PlaceCard, { type PlaceCardData } from './index';

const basePlace: PlaceCardData = {
    id: 1,
    name: 'Kyoto',
    country: 'Japan',
    image: 'https://img.example/kyoto.jpg',
    tagline: 'Temples and tea houses',
};

describe('PlaceCard', () => {
    it('renders the place name, country, tagline and a described image', () => {
        renderWithProviders(<PlaceCard place={basePlace} />);
        expect(
            screen.getByRole('heading', { name: 'Kyoto' })
        ).toBeInTheDocument();
        expect(screen.getByText('Japan')).toBeInTheDocument();
        expect(screen.getByText('Temples and tea houses')).toBeInTheDocument();
        const img = screen.getByRole('img', { name: 'Kyoto, Japan' });
        expect(img).toHaveAttribute('src', basePlace.image);
    });

    it('renders as a real button and fires onClick when activated', async () => {
        const onClick = vi.fn();
        renderWithProviders(<PlaceCard place={basePlace} onClick={onClick} />);
        await userEvent.click(screen.getByRole('button', { name: /kyoto/i }));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('omits the tagline when none is provided', () => {
        const { tagline: _tagline, ...noTagline } = basePlace;
        renderWithProviders(<PlaceCard place={noTagline as PlaceCardData} />);
        expect(
            screen.queryByText('Temples and tea houses')
        ).not.toBeInTheDocument();
    });

    it('shows no photo attribution when there is no photographer', () => {
        renderWithProviders(<PlaceCard place={basePlace} />);
        expect(screen.queryByText(/photo by/i)).not.toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'Unsplash' })
        ).not.toBeInTheDocument();
    });

    it('renders Unsplash attribution with a linked photographer when provided', () => {
        renderWithProviders(
            <PlaceCard
                place={{
                    ...basePlace,
                    photographerName: 'Ansel Adams',
                    photographerUrl: 'https://unsplash.com/@ansel',
                }}
            />
        );
        expect(screen.getByText(/photo by/i)).toBeInTheDocument();
        const author = screen.getByRole('link', { name: 'Ansel Adams' });
        expect(author).toHaveAttribute('href', 'https://unsplash.com/@ansel');
        expect(author).toHaveAttribute('rel', 'noopener noreferrer');
        expect(
            screen.getByRole('link', { name: 'Unsplash' })
        ).toHaveAttribute('href', 'https://unsplash.com');
    });

    it('renders the photographer as plain text (no link) when no URL is given', () => {
        renderWithProviders(
            <PlaceCard
                place={{ ...basePlace, photographerName: 'Jane Doe' }}
            />
        );
        expect(screen.getByText(/photo by/i)).toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'Jane Doe' })
        ).not.toBeInTheDocument();
    });

    it('stops attribution-link clicks from triggering the card onClick', async () => {
        const onClick = vi.fn();
        // jsdom logs an unimplemented-navigation notice on anchor clicks;
        // silence it so the assertion output stays clean.
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        renderWithProviders(
            <PlaceCard
                place={{
                    ...basePlace,
                    photographerName: 'Ansel Adams',
                    photographerUrl: 'https://unsplash.com/@ansel',
                }}
                onClick={onClick}
            />
        );
        await userEvent.click(screen.getByRole('link', { name: 'Unsplash' }));
        expect(onClick).not.toHaveBeenCalled();
        errSpy.mockRestore();
    });
});
