import type { ReactNode } from 'react';
import { Grid } from '@mui/material';
import '../../../App.scss';
import Footer from '../../Footer';
import Header from '../../Header';

interface LayoutProps {
    children?: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
    return (
        <div className="page-shell">
            <Header />
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
