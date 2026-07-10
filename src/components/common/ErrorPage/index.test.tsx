import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import ErrorPage from './index';

// Isolate ErrorPage from the full app shell (Header/Footer/SkipLink) that
// SubLayout drags in — render only its children here.
vi.mock('components/common/Layout/SubLayout', () => ({
    default: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

// Spy on navigation so the primary "Go to home" action can be asserted while
// keeping the real Link / MemoryRouter from react-router-dom.
const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('react-router-dom')>();
    return { ...actual, useNavigate: () => mockNavigate };
});

describe('ErrorPage', () => {
    it('renders the headline and description', () => {
        renderWithProviders(
            <ErrorPage
                title="Page not found"
                description="We couldn't find that place."
            />
        );
        expect(
            screen.getByRole('heading', { level: 1, name: 'Page not found' })
        ).toBeInTheDocument();
        expect(
            screen.getByText("We couldn't find that place.")
        ).toBeInTheDocument();
    });

    it('renders a default primary button that navigates home when clicked', async () => {
        renderWithProviders(<ErrorPage title="Oops" />);
        const home = screen.getByRole('button', { name: /go to home/i });
        await userEvent.click(home);
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('honors a custom primary action label', () => {
        renderWithProviders(
            <ErrorPage title="Oops" primaryActionLabel="Take me back" />
        );
        expect(
            screen.getByRole('button', { name: /take me back/i })
        ).toBeInTheDocument();
    });

    it('renders a secondary action as a link to its route', () => {
        renderWithProviders(
            <ErrorPage
                title="Not here"
                secondaryAction={{ label: 'Back to results', to: '/search' }}
            />
        );
        expect(
            screen.getByRole('link', { name: /back to results/i })
        ).toHaveAttribute('href', '/search');
    });

    it('renders a custom icon when provided', () => {
        renderWithProviders(
            <ErrorPage
                title="Oops"
                icon={<span data-testid="custom-icon">!</span>}
            />
        );
        expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('suppresses the icon when icon is null', () => {
        const { container } = renderWithProviders(
            <ErrorPage title="Oops" icon={null} />
        );
        expect(container.querySelector('.error-page-icon')).toBeNull();
    });
});
