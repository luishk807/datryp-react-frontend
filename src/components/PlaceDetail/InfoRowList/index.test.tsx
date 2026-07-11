import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import InfoRowList, { InfoRowListSkeleton, type InfoRow } from './index';

const rows: InfoRow[] = [
    { icon: <span>i1</span>, label: 'Language', value: 'Japanese' },
    { icon: <span>i2</span>, label: 'Currency', value: <strong>Yen</strong> },
];

describe('InfoRowList', () => {
    it('renders a term/definition pair for each row', () => {
        renderWithProviders(<InfoRowList rows={rows} />);
        const language = screen.getByText('Language');
        expect(language.tagName).toBe('DT');
        expect(screen.getByText('Japanese').tagName).toBe('DD');
        expect(screen.getByText('Yen')).toBeInTheDocument();
    });

    it('marks the icon wrapper as decorative (aria-hidden)', () => {
        const { container } = renderWithProviders(<InfoRowList rows={rows} />);
        const icons = container.querySelectorAll('.info-rows-icon');
        expect(icons.length).toBe(2);
        icons.forEach((icon) =>
            expect(icon).toHaveAttribute('aria-hidden', 'true')
        );
    });

    it('renders an empty list when there are no rows', () => {
        const { container } = renderWithProviders(<InfoRowList rows={[]} />);
        expect(container.querySelectorAll('.info-rows-row').length).toBe(0);
    });
});

describe('InfoRowListSkeleton', () => {
    it('renders five placeholder rows by default', () => {
        const { container } = renderWithProviders(<InfoRowListSkeleton />);
        expect(container.querySelectorAll('.info-rows-row').length).toBe(5);
    });

    it('honors a custom row count', () => {
        const { container } = renderWithProviders(
            <InfoRowListSkeleton rows={3} />
        );
        expect(container.querySelectorAll('.info-rows-row').length).toBe(3);
    });
});
