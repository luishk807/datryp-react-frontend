import classnames from 'classnames';
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
    /** Hide the page-header search bar on mobile (<= ~640px). Use on
     *  long-content pages like /trip-detail where the search is rarely
     *  needed mid-flow and competes with the page's own toolbar for
     *  vertical real estate. */
    hideHeaderSearchOnMobile?: boolean;
}

const Layout = ({
    children,
    title = '',
    titleAction,
    hideHeaderSearchOnMobile = false,
}: SubLayoutProps) => {
    return (
        <div
            className={classnames('page-shell', 'is-subpage', {
                'hide-header-search-mobile': hideHeaderSearchOnMobile,
            })}
        >
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
