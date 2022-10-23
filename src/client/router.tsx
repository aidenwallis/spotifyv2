import { Outlet, RouterProvider, createReactRouter, createRouteConfig } from "@tanstack/react-router";
import { PropsWithChildren } from "react";
import { Home } from "./home";

const routeConfig = createRouteConfig().addChildren((createRoute) => [createRoute({ path: "/", element: <Home /> })]);

const router = createReactRouter({ routeConfig });

export const Router = ({ children }: PropsWithChildren<{}>) => {
  return <RouterProvider router={router}>{children}</RouterProvider>;
};
