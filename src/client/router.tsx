import { Outlet, RootRoute, Route, Router, RouterProvider } from "@tanstack/react-router";
import { z } from "zod";
import { Home } from "./home";
import { PlayerWidget } from "./widget";

const rootRoute = RootRoute.withRouterContext<RouterContext>()({
  component: () => (
    <>
      <Outlet />
    </>
  ),
});

const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Home,
});

const overlayRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "overlay",
  component: () => (
    <>
      <Outlet />
    </>
  ),
});

const overlayIndex = new Route({
  getParentRoute: () => overlayRoute,
  path: "/",
});

const overlayToken = new Route({
  getParentRoute: () => overlayRoute,
  path: "$overlayToken",
  component: PlayerWidget,
  parseParams: ({ overlayToken }) => ({
    overlayToken: z.string().parse(overlayToken),
  }),
  stringifyParams: (v) => v,
});

const routeTree = rootRoute.addChildren([indexRoute, overlayRoute.addChildren([overlayIndex, overlayToken])]);

export const router = new Router({
  routeTree,
});

export const App = () => {
  return <RouterProvider router={router} />;
};

declare module "@tanstack/router" {
  interface Register {
    router: typeof router;
  }
}

type RouterContext = {};
