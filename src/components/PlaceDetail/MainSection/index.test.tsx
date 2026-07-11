import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import MainSection from './index';

describe('MainSection', () => {
    it('renders the title as a level-2 heading with its children', () => {
        renderWithProviders(
            <MainSection title="About Japan">
                <p>Body copy</p>
            </MainSection>
        );
        expect(
            screen.getByRole('heading', { level: 2, name: 'About Japan' })
        ).toBeInTheDocument();
        expect(screen.getByText('Body copy')).toBeInTheDocument();
    });

    it('exposes the section as a keyboard-focusable named region', () => {
        renderWithProviders(
            <MainSection title="About Japan">
                <p>Body copy</p>
            </MainSection>
        );

        const region = screen.getByRole('region', { name: 'About Japan' });
        expect(region).toHaveAttribute('tabindex', '0');
        const heading = screen.getByRole('heading', {
            level: 2,
            name: 'About Japan',
        });
        expect(heading.id).toBeTruthy();
        expect(region).toHaveAttribute('aria-labelledby', heading.id);
        expect(region).not.toHaveAttribute('aria-label');
    });

    it('describes the region by its body so focus reads the content', () => {
        renderWithProviders(
            <MainSection title="Budget">
                <p>Mid-range · around $120 per day</p>
            </MainSection>
        );

        const region = screen.getByRole('region', { name: 'Budget' });
        const describedBy = region.getAttribute('aria-describedby');
        expect(describedBy).toBeTruthy();
        expect(describedBy).not.toBe(region.getAttribute('aria-labelledby'));

        const body = document.getElementById(describedBy as string);
        expect(body).not.toBeNull();
        expect(body).toHaveClass('main-section-body');
        expect(body).toHaveTextContent('around $120 per day');

        expect(region).toHaveAccessibleDescription(/\$120 per day/);
    });

    it('renders a decorative icon wrapper when an icon is passed', () => {
        const { container } = renderWithProviders(
            <MainSection title="Nearby" icon={<svg data-testid="ic" />}>
                <span>x</span>
            </MainSection>
        );
        const icon = container.querySelector('.main-section-icon');
        expect(icon).not.toBeNull();
        expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('omits the icon wrapper when no icon is passed', () => {
        const { container } = renderWithProviders(
            <MainSection title="Plain">
                <span>x</span>
            </MainSection>
        );
        expect(container.querySelector('.main-section-icon')).toBeNull();
    });

    it('applies the requested size class and defaults to sm', () => {
        const { container, rerender } = renderWithProviders(
            <MainSection title="A" size="md">
                <span>x</span>
            </MainSection>
        );
        expect(container.querySelector('.main-section.size-md')).not.toBeNull();

        rerender(
            <MainSection title="A">
                <span>x</span>
            </MainSection>
        );
        expect(container.querySelector('.main-section.size-sm')).not.toBeNull();
    });
});
