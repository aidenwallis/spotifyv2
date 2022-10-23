import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./client/auth";
import { Router } from "./client/router";
import { TrpcClient } from "./client/trpc";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <TrpcClient>
        <Router />
      </TrpcClient>
    </AuthProvider>
  </React.StrictMode>
);
