import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import RouteErrorBoundary, { AppErrorBoundary } from './index';

// The fallback is the real ErrorPage → SubLayout; stub only the heavy chrome
// (Header/Footer) so the friendly page + its links render for real.
vi.mock('components/Header', () => ({ default: () => <header /> }));
vi.mock('components/Footer', () => ({ default: () => <footer /> }));

const Boom = ({ message = 'kaboom' }: { message?: string }) => {
    throw new Error(message);
};

describe('RouteErrorBoundary', () => {
    it('renders its children when nothing throws', () => {
        renderWithProviders(
            <RouteErrorBoundary>
                <p>Healthy page</p>
            </RouteErrorBoundary>
        );
        expect(screen.getByText('Healthy page')).toBeInTheDocument();
    });

    it('catches a render error and shows the friendly fallback with recovery links', () => {
        const errSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {});
        renderWithProviders(
            <RouteErrorBoundary>
                <Boom message="render blew up" />
            </RouteErrorBoundary>
        );

        expect(
            screen.getByRole('heading', { name: /we hit a snag/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /sign in/i })
        ).toHaveAttribute('href', '/account');
        expect(
            screen.getByRole('button', { name: /go to home/i })
        ).toBeInTheDocument();
        // The caught error's message is surfaced for debugging.
        expect(screen.getByText(/render blew up/)).toBeInTheDocument();
        // componentDidCatch logs the error.
        expect(errSpy).toHaveBeenCalled();
        errSpy.mockRestore();
    });

    it('respects custom title and description overrides', () => {
        const errSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {});
        renderWithProviders(
            <RouteErrorBoundary
                title="Custom headline"
                description="Custom recovery copy"
            >
                <Boom />
            </RouteErrorBoundary>
        );
        expect(
            screen.getByRole('heading', { name: 'Custom headline' })
        ).toBeInTheDocument();
        expect(screen.getByText('Custom recovery copy')).toBeInTheDocument();
        errSpy.mockRestore();
    });
});

describe('AppErrorBoundary', () => {
    it('renders its children on the happy path', () => {
        renderWithProviders(
            <AppErrorBoundary>
                <p>App content</p>
            </AppErrorBoundary>
        );
        expect(screen.getByText('App content')).toBeInTheDocument();
    });

    it('catches errors from anywhere in the tree', () => {
        const errSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {});
        renderWithProviders(
            <AppErrorBoundary>
                <Boom />
            </AppErrorBoundary>
        );
        expect(
            screen.getByRole('heading', { name: /we hit a snag/i })
        ).toBeInTheDocument();
        errSpy.mockRestore();
    });
});
