import type { ReactNode } from 'react';
import { Grid } from '@mui/material';
import 'App.css';
import './index.css';
import Footer from 'components/Footer';
import Header from 'components/Header/Subheader';

interface SubLayoutProps {
    children?: ReactNode;
    title?: string;
    titleAction?: ReactNode;
}

const Layout = ({ children, title = '', titleAction }: SubLayoutProps) => {
    return (
        <div className="page-shell">
            <Header />
            <main className="page-content">
                <Grid container spacing={0} id="layout" className="root">
                    <Grid item lg={8} md={12} xs={12} className="layout-container">
                        <Grid container>
                            <Grid item lg={12} md={12} xs={12} className="layout-title">
                                <span>{title}</span>
                                {titleAction}
                            </Grid>
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
