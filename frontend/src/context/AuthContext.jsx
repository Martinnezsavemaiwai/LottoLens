import { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as apiService from "../services/api";

const AuthContext = createContext();

const decodeToken = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    return null;
  }
};

const isTokenExpired = (decodedToken) => {
  if (!decodedToken || !decodedToken.exp) return true;
  // exp is in seconds, Date.now() is in milliseconds
  return decodedToken.exp * 1000 < Date.now();
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("auth_token"));
  const [user, setUser] = useState(() => {
    const savedToken = localStorage.getItem("auth_token");
    if (savedToken) {
      const decoded = decodeToken(savedToken);
      if (decoded && !isTokenExpired(decoded)) {
        return { email: decoded.jti || decoded.sub || "User" }; // jti is used for Email on Go backend
      }
    }
    return null;
  });

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
  }, []);

  // Validate token on mount
  useEffect(() => {
    if (token) {
      const decoded = decodeToken(token);
      if (!decoded || isTokenExpired(decoded)) {
        logout();
      }
    }
  }, [token, logout]);

  // Listen for unauthorized API errors
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
      setShowAuthModal(true);
    };

    window.addEventListener("lottolens:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("lottolens:unauthorized", handleUnauthorized);
    };
  }, [logout]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await apiService.login(email, password);
      const authToken = data.token;
      
      const decoded = decodeToken(authToken);
      if (!decoded) {
        throw new Error("Invalid server token payload");
      }

      localStorage.setItem("auth_token", authToken);
      setToken(authToken);
      setUser({ email: decoded.jti || decoded.sub || email });
      setShowAuthModal(false);
      return { success: true };
    } catch (err) {
      console.error("Login failed:", err);
      const errMsg = err.response?.data?.error || err.message || "การเข้าสู่ระบบล้มเหลว";
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password) => {
    setLoading(true);
    try {
      const data = await apiService.register(email, password);
      const authToken = data.token;
      
      const decoded = decodeToken(authToken);
      if (!decoded) {
        throw new Error("Invalid server token payload");
      }

      localStorage.setItem("auth_token", authToken);
      setToken(authToken);
      setUser({ email: decoded.jti || decoded.sub || email });
      setShowAuthModal(false);
      return { success: true };
    } catch (err) {
      console.error("Registration failed:", err);
      const errMsg = err.response?.data?.error || err.message || "การสมัครสมาชิกล้มเหลว";
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        showAuthModal,
        setShowAuthModal,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
