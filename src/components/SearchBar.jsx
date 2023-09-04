import { Grid } from '@mui/material'
import '../App.css'

const SearchBar = () => {
  return (
    <Grid container className="searchbar">
      <Grid item lg={12} style={{ margin: '10px 10px', border: 'red 2px solid', borderRadius: 5, padding: 5}}>
        <Grid container  style={{display: 'flex'}}>
          <Grid item lg={10}>
            <input type='text' style={{ border: 'none', width: '100%'}} />
          </Grid>
          <Grid item lg={2}>
            <button>hey</button>
          </Grid>
        </Grid>
      </Grid>
  </Grid>
  )
}

export default SearchBar;