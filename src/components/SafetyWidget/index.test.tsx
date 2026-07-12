import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import type { SafetyInfo } from 'types';
import SafetyWidget from './index';

const info = (over: Partial<SafetyInfo> = {}): SafetyInfo => ({
    score: 78,
    level: 'low',
    summary: 'Generally safe for travelers with normal precautions.',
    ...over,
});

describe('SafetyWidget', () => {
    it('renders the score, its meter, and the summary', () => {
        renderWithProviders(<SafetyWidget info={info()} />);
        const meter = screen.getByRole('meter', { name: 'Safety score' });
        expect(meter).toHaveAttribute('aria-valuenow', '78');
        expect(meter).toHaveAttribute('aria-valuemin', '0');
        expect(meter).toHaveAttribute('aria-valuemax', '100');
        // Human phrasing = the risk level (aria-hidden visual duplicate stays
        // on-screen), so Narrator reads the level once.
        expect(meter).toHaveAttribute('aria-valuetext', 'Low risk');
        expect(screen.getByText('78')).toBeInTheDocument();
        expect(screen.getByText('/100')).toBeInTheDocument();
        expect(
            screen.getByText(
                'Generally safe for travelers with normal precautions.'
            )
        ).toBeInTheDocument();
        expect(screen.getByText(/Approximate/i)).toBeInTheDocument();
    });

    it.each([
        ['low', 'Low risk'],
        ['moderate', 'Moderate risk'],
        ['high', 'High risk'],
    ] as const)(
        'pairs the %s level with a text label (colour is never the only signal)',
        (level, label) => {
            renderWithProviders(<SafetyWidget info={info({ level })} />);
            expect(screen.getByText(label)).toBeInTheDocument();
            // Meter's value text reuses the same translated level string.
            expect(screen.getByRole('meter')).toHaveAttribute(
                'aria-valuetext',
                label
            );
        }
    );

    it.each([
        [150, '100'],
        [-20, '0'],
        [63.6, '64'],
    ])('clamps + rounds score %s to %s', (score, shown) => {
        renderWithProviders(<SafetyWidget info={info({ score })} />);
        expect(screen.getByRole('meter')).toHaveAttribute(
            'aria-valuenow',
            shown
        );
    });
});
