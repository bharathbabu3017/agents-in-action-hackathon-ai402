import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Marketplace from "./pages/Marketplace";
import ResourceDetails from "./pages/ResourceDetails";
import Playground from "./pages/Playground";
import ListResource from "./pages/ListResource";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/resource/:id" element={<ResourceDetails />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/playground/:resourceId" element={<Playground />} />
        <Route path="/list-resource" element={<ListResource />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
