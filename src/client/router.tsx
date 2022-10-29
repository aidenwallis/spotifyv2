import { RouterProvider, createReactRouter, createRouteConfig } from "@tanstack/react-router";
import { PropsWithChildren } from "react";
import { z } from "zod";
import { Home } from "./home";
import { PlayerWidget } from "./widget";

const routeConfig = createRouteConfig().addChildren((createRoute) => [
  createRoute({ path: "/", element: <Home /> }),
  createRoute({ path: "overlay" }).addChildren((createRoute) => [
    createRoute({
      path: ":overlayToken",
      element: <PlayerWidget />,
      parseParams: ({ overlayToken }) => ({
        overlayToken: z.string().parse(overlayToken),
      }),
      stringifyParams: (v) => v,
    }),
  ]),
]);

export const router = createReactRouter({ routeConfig });

export const Router = ({ children }: PropsWithChildren<{}>) => {
  return <RouterProvider router={router}>{children}</RouterProvider>;
};
