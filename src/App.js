
import React from 'react'
import './App.css';
import { lazy, Suspense } from 'react'
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';


const Home = lazy(() => import('./components/Home'))

function App() {
  return (
    <Router>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
    </Router>
  );
}

export default App;