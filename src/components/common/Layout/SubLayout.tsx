import type { ReactNode } from 'react';
import { Grid } from '@mui/material';
import 'App.css';
import './index.css';
import Footer from 'components/Footer';
import Header from 'components/Header/Subheader';

interface SubLayoutProps {
    children?: ReactNode;
    title?: string;
}

const Layout = ({ children, title = '' }: SubLayoutProps) => {
    return (
        <Grid container spacing={0} id="layout" className="root">
            <Header />
            <Grid item lg={8} md={12} xs={12} className="layout-container">
                <Grid container>
                    <Grid item lg={12} md={12} xs={12} className="layout-title">
                        {title}
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="homeContainer">
                        {children}
                    </Grid>
                </Grid>
            </Grid>
            <Footer />
        </Grid>
    );
};

export default Layout;
