import type { ReactNode } from 'react';
import { Grid } from '@mui/material';
import '../../../App.css';
import Footer from '../../Footer';
import Header from '../../Header';

interface LayoutProps {
    children?: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
    return (
        <Grid container spacing={0} className="root">
            <Header />
            <Grid item lg={12} md={12} className="homeContainer">
                {children}
            </Grid>
            <Footer />
        </Grid>
    );
};

export default Layout;
