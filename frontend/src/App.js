import "@/App.css";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Home from "@/pages/Home";
import { Journey } from "@/components/site/Journey";
import EPK from "@/pages/EPK";
import Contact from "@/pages/Contact";
import Music from "@/pages/Music";
import Tour from "@/pages/Tour";
import Community from "@/pages/Community";
import Shop from "@/pages/Shop";
import { TrackingPixel } from "@/components/site/TrackingPixel";
import { GlowCursor } from "@/components/site/GlowCursor";
import { SacredGeometryField } from "@/components/site/SacredGeometryField";
import { WorldDim } from "@/components/site/WorldDim";
import { FilmGrain } from "@/components/site/FilmGrain";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

// The journey pages (home + about) are full-screen paintings with their own lighting; the site-wide
// cursor dimming would sit on top of them.
function SiteDim() {
  const { pathname } = useLocation();
  return pathname === "/" || pathname === "/about" ? null : <WorldDim />;
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <ScrollToTop />
        <TrackingPixel />
        <SacredGeometryField />
        <SiteDim />
        <GlowCursor />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<Journey start="world" />} />
          <Route path="/epk" element={<EPK />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/music" element={<Music />} />
          <Route path="/tour" element={<Tour />} />
          <Route path="/community" element={<Community />} />
          <Route path="/shop" element={<Shop />} />
        </Routes>
        <FilmGrain />
      </BrowserRouter>
    </div>
  );
}

export default App;
