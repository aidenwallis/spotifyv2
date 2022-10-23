import Cookies from "js-cookie";
import { createContext, PropsWithChildren, useCallback, useContext, useState } from "react";

const AuthContext = createContext<{ isAuthenticated: boolean; token: string; logout(): void }>({
  isAuthenticated: false,
  token: "",
  logout: () => null,
});

export function useAuth() {
  return useContext(AuthContext);
}

const sessionCookieName = "session";

export const AuthProvider = ({ children }: PropsWithChildren<{}>) => {
  const [token, setToken] = useState(Cookies.get(sessionCookieName) || "");
  const logout = useCallback(() => {
    setToken("");
    Cookies.remove(sessionCookieName);
  }, [setToken]);
  const isAuthenticated = !!token;

  return <AuthContext.Provider value={{ logout, token, isAuthenticated }}>{children}</AuthContext.Provider>;
};
