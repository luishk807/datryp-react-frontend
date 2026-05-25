/**
 * Route-level error boundary. Catches any uncaught render / lifecycle
 * error in the wrapped subtree and shows a friendly error page with
 * "Sign in" + "Go home" links instead of leaving the user staring at
 * a blank white page.
 *
 * Why: the app previously had no error boundary, so a single render
 * error anywhere in a route unmounted the whole tree (React's default
 * for uncaught errors in concurrent mode). The most-reported symptom
 * was the friend-request email link landing on a blank page when the
 * recipient was logged out — that one route is fixed by reusing
 * AuthGate's existing login UI, but the broader hardening lives here.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import ErrorPage from 'components/common/ErrorPage';

interface RouteErrorBoundaryProps {
    children: ReactNode;
    /** Optional title override for the fallback page. */
    title?: string;
    /** Optional description override. */
    description?: ReactNode;
}

interface RouteErrorBoundaryState {
    hasError: boolean;
    errorMessage?: string;
}

class RouteErrorBoundary extends Component<
    RouteErrorBoundaryProps,
    RouteErrorBoundaryState
> {
    state: RouteErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(err: unknown): RouteErrorBoundaryState {
        return {
            hasError: true,
            errorMessage:
                err instanceof Error ? err.message : 'Unknown error',
        };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // Surface to the console for in-browser debugging — production
        // builds strip console.error in some setups but in DaTryp's
        // current Vite config it stays. Replace with a remote logger
        // (Sentry, Rollbar, etc.) if/when one is wired up.
        console.error('[RouteErrorBoundary]', error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, errorMessage: undefined });
    };

    render() {
        if (!this.state.hasError) return this.props.children;
        return (
            <ErrorPage
                pageTitle="Something went wrong"
                title={this.props.title ?? "We hit a snag loading this page"}
                description={
                    this.props.description ?? (
                        <>
                            Try reloading, signing in, or heading back
                            to the home page. If it keeps happening,
                            let us know via the contact page.
                            {this.state.errorMessage && (
                                <>
                                    <br />
                                    <small style={{ opacity: 0.6 }}>
                                        Error: {this.state.errorMessage}
                                    </small>
                                </>
                            )}
                        </>
                    )
                }
                secondaryAction={{ label: 'Sign in', to: '/account' }}
            />
        );
    }
}

export default RouteErrorBoundary;
