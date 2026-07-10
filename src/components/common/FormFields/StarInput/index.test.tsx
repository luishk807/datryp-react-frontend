import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StarInput from './index';

// The stars are MUI SvgIcons — MUI stamps `aria-hidden="true"` on them, so
// although each carries a `role="radio"` attribute they're excluded from the
// accessibility tree and can't be queried via getByRole. We therefore query
// the star nodes by their stable class and pin the actual rendered behaviour.
const stars = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('.star-input-star'));
const filled = (container: HTMLElement) =>
    container.querySelectorAll('.star-input-star.filled');

describe('StarInput', () => {
    it('renders an interactive radiogroup with five stars', () => {
        const { container } = render(
            <StarInput value={0} onChange={() => {}} />
        );
        expect(
            screen.getByRole('radiogroup', { name: 'Pick a rating' })
        ).toBeInTheDocument();
        expect(stars(container)).toHaveLength(5);
    });

    it('marks the star matching the current value with aria-checked', () => {
        const { container } = render(
            <StarInput value={3} onChange={() => {}} />
        );
        const all = stars(container);
        expect(all[2]).toHaveAttribute('aria-checked', 'true');
        expect(all[0]).not.toHaveAttribute('aria-checked');
        expect(all[4]).not.toHaveAttribute('aria-checked');
    });

    it('calls onChange with the clicked star number', async () => {
        const onChange = vi.fn();
        const { container } = render(
            <StarInput value={0} onChange={onChange} />
        );
        // The click handler lives on the aria-hidden svg, so dispatch directly.
        fireEvent.click(stars(container)[3]);
        expect(onChange).toHaveBeenCalledWith(4);
    });

    it('fills stars up to the current value', () => {
        const { container } = render(
            <StarInput value={2} onChange={() => {}} />
        );
        expect(filled(container)).toHaveLength(2);
    });

    it('previews the hovered rating by filling up to the hovered star', async () => {
        const { container } = render(
            <StarInput value={0} onChange={() => {}} />
        );
        expect(filled(container)).toHaveLength(0);
        await userEvent.hover(stars(container)[3]);
        expect(filled(container)).toHaveLength(4);
        await userEvent.unhover(stars(container)[3]);
        expect(filled(container)).toHaveLength(0);
    });

    it('renders a non-interactive image in readonly mode', () => {
        const { container } = render(<StarInput value={4} readonly />);
        expect(
            screen.getByRole('img', { name: '4 out of 5 stars' })
        ).toBeInTheDocument();
        // No radio semantics in readonly mode.
        stars(container).forEach((s) =>
            expect(s).not.toHaveAttribute('role', 'radio')
        );
    });

    it('does not call onChange when a readonly star is clicked', async () => {
        const onChange = vi.fn();
        const { container } = render(
            <StarInput value={4} readonly onChange={onChange} />
        );
        fireEvent.click(stars(container)[0]);
        expect(onChange).not.toHaveBeenCalled();
    });

    it('applies the size preset class', () => {
        const { container } = render(
            <StarInput value={1} onChange={() => {}} size="lg" />
        );
        expect(container.querySelector('.star-input')).toHaveClass('size-lg');
    });

    it('defaults to md size when size is omitted', () => {
        const { container } = render(
            <StarInput value={1} onChange={() => {}} />
        );
        expect(container.querySelector('.star-input')).toHaveClass('size-md');
    });
});
