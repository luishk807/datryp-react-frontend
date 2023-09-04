import { Grid } from '@mui/material'
import '../App.css'
import Footer from './Footer';
import Header from './Header';
import SearchBar from './SearchBar';
const Layout = ({children}) => {
  return (
    <Grid container spacing={0} className="root">
        {/* header */}
      <Header />
      {/* body */}
      {/* <Grid item lg={12} className="homeContainer">
        <Grid container  spacing={0}  className="searchContainer">
          <Grid item lg={12} className="mainText">Where are you planning to go</Grid>
          <Grid item lg={12}>
            <Grid container>
              <Grid item lg={12}>
                <Grid container style={{display: 'flex'}}>
                  <Grid item>Single Place</Grid>
                  <Grid item>Multiple locations</Grid>
                </Grid>
              </Grid>
              <Grid item lg={12}>
                <SearchBar />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid> */}
      {{ children}}

      {/* footer */}
      <Footer />
    </Grid>
  )
}

export default Layout