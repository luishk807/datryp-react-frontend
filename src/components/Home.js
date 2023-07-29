import { Grid } from '@mui/material'

const Home = () => {
  return (
    <Grid container style={{display: 'flex'}}>
      <Grid item lg={3} xs={12} style={{ background: 'black'}}>
        <img src="/images/logo.svg" alt="logo" width="150"/>
      </Grid>
      <Grid item lg={9} xs={12} style={{ background: 'grey'}}>
        <Grid container style={{display: 'flex'}}>
            <Grid item lg={12} style={{ justifyContent: 'end', display: 'flex', backgroundColor: 'purple'}}>body</Grid>
            <Grid item lg={12} style={{ justifyContent: 'flex-end', backgroundColor: 'blue'}}>hey</Grid>
        </Grid>
      </Grid>
    </Grid>
  )
}

export default Home