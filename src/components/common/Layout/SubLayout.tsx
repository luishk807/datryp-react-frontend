import type { ReactNode } from 'react';
import { Grid } from '@mui/material';
import 'App.scss';
import './index.scss';
import Footer from 'components/Footer';
import Header from 'components/Header';

interface SubLayoutProps {
    children?: ReactNode;
    title?: string;
    titleAction?: ReactNode;
    /** When true, skip the constrained grid + title bar and render
     *  children directly in `<main>`. Used by the /atlas-map page so the
     *  Mapbox canvas can span the full viewport width. The footer is
     *  the same minimal one-line strip every other route uses; it's
     *  hidden on phones for full-bleed pages so the map gets every
     *  available pixel (see Footer/index.scss). */
    fullBleed?: boolean;
}

const Layout = ({
    children,
    title = '',
    titleAction,
    fullBleed = false,
}: SubLayoutProps) => {
    if (fullBleed) {
        return (
            <div className="page-shell is-subpage is-full-bleed">
                {/* `title` doubles as the in-header page-title slot on
                    full-bleed pages so the chrome row stays a single
                    line and the page-body can claim 100% vertical
                    space (e.g. the /atlas-map globe). */}
                <Header
                    withSearch
                    pageTitle={
                        title || titleAction ? (
                            <>
                                {title}
                                {titleAction}
                            </>
                        ) : undefined
                    }
                />
                <main className="page-content page-content-full-bleed">
                    {children}
                </main>
                <Footer />
            </div>
        );
    }
    return (
        // `is-subpage` flags subpages for header CSS (mobile logo
        // swap). The previous `hideHeaderSearchOnMobile` opt-in
        // (suppressed the search on long-content pages) is gone — the
        // search now always shows on subpages on mobile per latest UX
        // direction. Re-add per-page if a future page needs to hide
        // it again.
        <div className="page-shell is-subpage">
            <Header withSearch />
            <main className="page-content">
                <Grid container spacing={0} id="layout" className="root">
                    <Grid item lg={8} md={12} xs={12} className="layout-container">
                        <Grid container>
                            {title && (
                                <Grid
                                    item
                                    lg={12}
                                    md={12}
                                    xs={12}
                                    className="layout-title"
                                >
                                    <span>{title}</span>
                                    {titleAction}
                                </Grid>
                            )}
                            <Grid item lg={12} md={12} xs={12} className="homeContainer">
                                {children}
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </main>
            <Footer />
        </div>
    );
};

export default Layout;
