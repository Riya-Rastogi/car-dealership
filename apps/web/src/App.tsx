import { Route, Routes } from "react-router-dom";
import { PublicOnly, Protected } from "./auth/guards.js";
import { Layout } from "./components/Layout.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { GaragePage } from "./pages/GaragePage.js";
import { LoginPage } from "./pages/LoginPage.js";
import { NotFoundPage } from "./pages/NotFoundPage.js";
import { RegisterPage } from "./pages/RegisterPage.js";
import { VehicleDetailPage } from "./pages/VehicleDetailPage.js";

export function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <RegisterPage />
          </PublicOnly>
        }
      />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="vehicles/:id" element={<VehicleDetailPage />} />
        <Route path="garage" element={<GaragePage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
