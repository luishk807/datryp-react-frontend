import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import type { NamedTip } from 'types';
import TipListSection from './index';

const tips: NamedTip[] = [
    { name: 'Senso-ji Temple', why: "Tokyo's oldest temple" },
    { name: 'Tsukiji Market', why: 'Fresh sushi breakfast' },
];

describe('TipListSection', () => {
    it('renders the live list with a count badge once data resolves', () => {
        const { container } = renderWithProviders(
            <TipListSection
                title="Things to do"
                icon={<PlaceRoundedIcon />}
                items={tips}
            />
        );
        expect(
            screen.getByRole('heading', { name: /things to do/i })
        ).toBeInTheDocument();
        expect(screen.getByText('Senso-ji Temple')).toBeInTheDocument();
        expect(
            container.querySelector('.detail-section-badge')
        ).toHaveTextContent('2');
    });

    it('renders the skeleton (no badge) while items are loading', () => {
        const { container } = renderWithProviders(
            <TipListSection
                title="Things to do"
                icon={<PlaceRoundedIcon />}
                items={undefined}
            />
        );
        expect(screen.queryByText('Senso-ji Temple')).not.toBeInTheDocument();
        expect(container.querySelectorAll('.tip-list-item')).toHaveLength(5);
        expect(
            container.querySelector('.detail-section-badge')
        ).not.toBeInTheDocument();
    });
});
