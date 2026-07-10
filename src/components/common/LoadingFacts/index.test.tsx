import { describe, it, expect, vi } from 'vitest';
import {
    renderWithProviders,
    screen,
    act,
} from '../../../test/renderWithProviders';
import LoadingFacts from './index';

describe('LoadingFacts', () => {
    it('renders a status region weaving in the place name', () => {
        renderWithProviders(<LoadingFacts placeName="Kyoto" />);
        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.getByText('Almost there')).toBeInTheDocument();
        expect(
            screen.getByText(/Pulling together travel info for Kyoto/)
        ).toBeInTheDocument();
    });

    it('renders the headline when provided', () => {
        renderWithProviders(
            <LoadingFacts placeName="Kyoto" headline="Just a sec" />
        );
        expect(screen.getByText('Just a sec')).toBeInTheDocument();
    });

    it('merges a custom className onto the wrapper', () => {
        const { container } = renderWithProviders(
            <LoadingFacts placeName="Kyoto" className="detail-loader" />
        );
        expect(
            container.querySelector('.loading-facts.detail-loader')
        ).toBeTruthy();
    });

    it('rotates to the next fact after the interval elapses', () => {
        vi.useFakeTimers();
        try {
            renderWithProviders(
                <LoadingFacts
                    placeName="Kyoto"
                    countryName="Japan"
                    intervalMs={4500}
                />
            );
            expect(screen.getByText('Almost there')).toBeInTheDocument();
            act(() => {
                vi.advanceTimersByTime(4500);
            });
            expect(screen.getByText('Heading to Japan?')).toBeInTheDocument();
        } finally {
            vi.useRealTimers();
        }
    });

    it('uses a generic fact when no place/country name is supplied', () => {
        renderWithProviders(<LoadingFacts placeName="" />);
        // No place/country fact prepended → the first card is a generic tip,
        // but the status region still renders a title + body.
        const status = screen.getByRole('status');
        expect(status).toBeInTheDocument();
        expect(status.querySelector('.loading-facts-title')?.textContent)
            .toBeTruthy();
    });
});
