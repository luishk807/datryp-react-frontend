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
import { useLocation } from 'react-router-dom';
import ErrorPage from 'components/common/ErrorPage';

interface RouteErrorBoundaryProps {
    children: ReactNode;
    /** Optional title override for the fallback page. */
    title?: string;
    /** Optional description override. */
    description?: ReactNode;
    /** When this value changes, a tripped boundary resets itself WITHOUT
     *  remounting its children. The pathname-keyed `RouteErrorBoundary`
     *  wrapper doesn't need it (it remounts on navigation), but the
     *  app-level `AppErrorBoundary` does — it can't remount the whole
     *  route tree on every navigation, so it clears the error this way. */
    resetKey?: string;
}

interface RouteErrorBoundaryState {
    hasError: boolean;
    errorMessage?: string;
}

class RouteErrorBoundaryClass extends Component<
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

    componentDidUpdate(prevProps: RouteErrorBoundaryProps) {
        // Navigation away from a broken page should clear the fallback so
        // the user lands on a working page instead of the error screen.
        if (
            this.state.hasError &&
            prevProps.resetKey !== this.props.resetKey
        ) {
            this.handleReset();
        }
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

/** Wrapper that re-mounts the boundary on every navigation so a stale
 *  `hasError=true` state doesn't survive a Sign in / Go home click and
 *  leave the user staring at the same fallback page after navigating
 *  away. React reuses the same component instance across route
 *  changes when only the URL differs, so `state.hasError` would stick
 *  unless we explicitly key the boundary by pathname. */
const RouteErrorBoundary = (props: RouteErrorBoundaryProps) => {
    const location = useLocation();
    return <RouteErrorBoundaryClass key={location.pathname} {...props} />;
};

export default RouteErrorBoundary;

/**
 * App-wide safety net. Wraps the ENTIRE route tree so a render error in any
 * page — including the ungated public ones (Home, Login, Signup, City,
 * Country …) that don't have their own `RouteErrorBoundary` — falls back to a
 * friendly error page instead of unmounting the whole app and leaving a blank
 * screen.
 *
 * Unlike `RouteErrorBoundary` it must NOT remount on every navigation (that
 * would tear down and refetch the whole route tree, and re-mount the Dashboard
 * shell on each tab switch). Instead it passes the pathname as `resetKey` so a
 * tripped boundary clears itself when the user navigates away — without
 * remounting its children.
 */
export const AppErrorBoundary = ({ children }: { children: ReactNode }) => {
    const location = useLocation();
    return (
        <RouteErrorBoundaryClass resetKey={location.pathname}>
            {children}
        </RouteErrorBoundaryClass>
    );
};
