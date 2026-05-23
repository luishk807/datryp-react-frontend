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
}

const Layout = ({ children, title = '', titleAction }: SubLayoutProps) => {
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
