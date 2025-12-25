import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import "./styles/tailwind.css";

import Shell from "./pages/Shell";
import LiveScan from "./pages/LiveScan";
import Results from "./pages/Results";
import History from "./pages/History";
import Dashboard from "./pages/Dashboard";
import ScanDetails from "./pages/ScanDetails";
import Healthz from "./pages/Healthz";
import { ToastProvider } from "@/components/Toast";

// Auth pages (login & register)
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

const router = createBrowserRouter([
  // Main app layout (navbar, tabs, ...)
  {
    path: "/",
    element: <Shell />,
    children: [
      { index: true, element: <LiveScan /> },
      { path: "results", element: <Results /> },
      { path: "history", element: <History /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "dashboard/:id", element: <ScanDetails /> },
      { path: "healthz", element: <Healthz /> },
      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },

  // Standalone login page outside the Shell (no scan tabs)
  {
    path: "/login",
    element: <LoginPage />,
  },

  // Standalone registration page
  {
    path: "/register",
    element: <RegisterPage />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  </React.StrictMode>
);
