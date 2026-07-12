import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import SubLayout from './SubLayout';

// Header/Footer drag in useUser, SearchBar and a stack of data hooks that
// aren't the subject here — stub them so the page shell is tested alone.
vi.mock('components/Header', () => ({
    default: () => <header data-testid="app-header" />,
}));
vi.mock('components/Footer', () => ({
    default: () => <footer data-testid="app-footer" />,
}));

describe('SubLayout', () => {
    it('renders children inside a <main> landmark', () => {
        renderWithProviders(
            <SubLayout>
                <p>Sub page body</p>
            </SubLayout>
        );
        expect(screen.getByText('Sub page body')).toBeInTheDocument();
        const main = screen.getByRole('main');
        expect(main).toHaveAttribute('id', 'main-content');
    });

    it('renders a skip link that targets the main content', () => {
        renderWithProviders(<SubLayout>body</SubLayout>);
        const skip = screen.getByRole('link', {
            name: /skip to main content/i,
        });
        expect(skip).toHaveAttribute('href', '#main-content');
    });

    it('renders the header and footer chrome', () => {
        renderWithProviders(<SubLayout>body</SubLayout>);
        expect(screen.getByTestId('app-header')).toBeInTheDocument();
        expect(screen.getByTestId('app-footer')).toBeInTheDocument();
    });

    it('renders the title as a level-1 heading when provided', () => {
        renderWithProviders(<SubLayout title="My Trips">body</SubLayout>);
        const heading = screen.getByRole('heading', {
            level: 1,
            name: 'My Trips',
        });
        expect(heading).toHaveClass('layout-title-text');
    });

    it('omits the title heading when no title is given', () => {
        renderWithProviders(<SubLayout>body</SubLayout>);
        expect(
            screen.queryByRole('heading', { level: 1 })
        ).not.toBeInTheDocument();
    });

    it('moves focus to the title on mount when focusTitleOnMount is set', () => {
        renderWithProviders(
            <SubLayout title="Account" focusTitleOnMount>
                body
            </SubLayout>
        );
        const heading = screen.getByRole('heading', {
            level: 1,
            name: 'Account',
        });
        // Programmatic focus target: focusable (-1) and actually focused, so a
        // screen reader announces the page after an in-app navigation.
        expect(heading).toHaveAttribute('tabindex', '-1');
        expect(heading).toHaveFocus();
    });

    it('does not focus or make the title focusable by default', () => {
        renderWithProviders(<SubLayout title="My Trips">body</SubLayout>);
        const heading = screen.getByRole('heading', {
            level: 1,
            name: 'My Trips',
        });
        expect(heading).not.toHaveAttribute('tabindex');
        expect(heading).not.toHaveFocus();
    });

    it('renders a supplied titleAction alongside the title', () => {
        renderWithProviders(
            <SubLayout
                title="Atlas"
                titleAction={<button type="button">Do thing</button>}
            >
                body
            </SubLayout>
        );
        expect(
            screen.getByRole('heading', { level: 1, name: 'Atlas' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Do thing' })
        ).toBeInTheDocument();
    });

    it('renders the full-bleed variant with no title/action', () => {
        const { container } = renderWithProviders(
            <SubLayout fullBleed>
                <div>Bare canvas</div>
            </SubLayout>
        );
        expect(screen.getByText('Bare canvas')).toBeInTheDocument();
        expect(
            container.querySelector('.page-content-full-bleed')
        ).toBeInTheDocument();
    });

    it('renders the full-bleed variant with a full-bleed main region', () => {
        const { container } = renderWithProviders(
            <SubLayout fullBleed title="Map">
                <div>Map canvas</div>
            </SubLayout>
        );
        expect(screen.getByText('Map canvas')).toBeInTheDocument();
        const main = screen.getByRole('main');
        expect(main).toHaveClass('page-content-full-bleed');
        expect(
            container.querySelector('.page-shell.is-full-bleed')
        ).toBeInTheDocument();
    });
});
