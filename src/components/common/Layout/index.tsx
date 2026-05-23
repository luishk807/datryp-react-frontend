import type { ReactNode } from 'react';
import classnames from 'classnames';
import { Grid } from '@mui/material';
import '../../../App.scss';
import Footer from '../../Footer';
import Header from '../../Header';

interface LayoutProps {
    children?: ReactNode;
    /** Show the header's searchbar on mobile only — desktop hides it
     *  because the page (e.g. the homepage hero) has its own bigger
     *  search affordance and rendering both is redundant. Opt-in
     *  because most full-page layouts (homepage being the canonical
     *  case) don't want the header search competing with their own
     *  hero. */
    mobileHeaderSearch?: boolean;
}

const Layout = ({ children, mobileHeaderSearch = false }: LayoutProps) => {
    return (
        <div
            className={classnames('page-shell', {
                'hide-header-search-desktop': mobileHeaderSearch,
            })}
        >
            <Header withSearch={mobileHeaderSearch} />
            <main className="page-content">
                <Grid container spacing={0} className="root">
                    <Grid item lg={12} md={12} className="homeContainer">
                        {children}
                    </Grid>
                </Grid>
            </main>
            <Footer />
        </div>
    );
};

export default Layout;
