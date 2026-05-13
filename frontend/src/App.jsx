import { Route, Routes, useLocation } from "react-router-dom";
import "./style.css";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import AddCategory from "./pages/AddCategory";
import IngredientsPage from "./pages/IngredientsPage";
import MenuPage from "./pages/MenuPage";
import OrdersPage from "./pages/OrdersPage";
import TablesPage from "./pages/TablesPage";

function App() {
  const location = useLocation();

  if (location.pathname === "/login" || location.pathname === "/register") {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/tables" element={<TablesPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/categories" element={<AddCategory />} />
          <Route path="/ingredients" element={<IngredientsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
