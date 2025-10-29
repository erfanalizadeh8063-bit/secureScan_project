import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import "./styles/tailwind.css";
import Shell from "./pages/Shell";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Results from "./pages/Results";
import History from "./pages/History";
import Dashboard from "./pages/Dashboard";
import ScanDetails from "./pages/ScanDetails";
import Healthz from "./pages/Healthz";
import { ToastProvider } from "@/components/Toast";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Shell />,
  children: [
  { index: true, element: <Landing /> },
      { path: "results", element: <Results /> },
      { path: "history", element: <History /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "dashboard/:id", element: <ScanDetails /> }, // details route
  { path: "healthz", element: <Healthz /> },
      { path: "*", element: <Navigate to="/dashboard" replace /> }, // 404 fallback
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);


<React.StrictMode>
  <ToastProvider>
    <RouterProvider router={router} />
  </ToastProvider>
</React.StrictMode>
