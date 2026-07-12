import { useEffect, useRef, type ReactNode } from 'react';
import { Grid } from '@mui/material';
import 'App.scss';
import './index.scss';
import Footer from 'components/Footer';
import Header from 'components/Header';
import SkipLink from 'components/common/SkipLink';

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
    /** When true, move keyboard focus to the page `<h1>` on mount so
     *  screen-reader users hear which page they landed on after an in-app
     *  navigation (e.g. opening Account from the header menu), instead of
     *  focus being stranded on the trigger they clicked. The title is a
     *  programmatic focus target (tabIndex -1), not a Tab stop; its outline
     *  is suppressed for that non-keyboard focus in the stylesheet. */
    focusTitleOnMount?: boolean;
}

const Layout = ({
    children,
    title = '',
    titleAction,
    fullBleed = false,
    focusTitleOnMount = false,
}: SubLayoutProps) => {
    const titleRef = useRef<HTMLHeadingElement>(null);
    useEffect(() => {
        if (focusTitleOnMount) titleRef.current?.focus();
    }, [focusTitleOnMount]);
    if (fullBleed) {
        return (
            <div className="page-shell is-subpage is-full-bleed">
                <SkipLink />
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
                <main id="main-content" className="page-content page-content-full-bleed">
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
            <SkipLink />
            <Header withSearch />
            <main id="main-content" className="page-content">
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
                                    <h1
                                        ref={titleRef}
                                        tabIndex={focusTitleOnMount ? -1 : undefined}
                                        className="layout-title-text"
                                    >
                                        {title}
                                    </h1>
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
