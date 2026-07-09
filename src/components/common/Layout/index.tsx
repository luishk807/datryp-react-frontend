import type { ReactNode } from 'react';
import { Grid } from '@mui/material';
import '../../../App.scss';
import Footer from '../../Footer';
import Header from '../../Header';
import SkipLink from '../SkipLink';

interface LayoutProps {
    children?: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
    return (
        <div className="page-shell">
            <SkipLink />
            <Header />
            <main id="main-content" className="page-content">
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
