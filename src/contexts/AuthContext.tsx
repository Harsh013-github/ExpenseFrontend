import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api, User } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Try to get fresh user info from /auth/me
      try {
        const response = await api.getMe();
        setUser(response.data);
        localStorage.setItem("user_data", JSON.stringify(response.data));
      } catch (error: any) {
        // If /auth/me endpoint doesn't exist (404), use cached user data
        if (error.status === 404 || error.message?.includes("404")) {
          const cachedUser = localStorage.getItem("user_data");
          if (cachedUser) {
            setUser(JSON.parse(cachedUser));
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("tokenExpiry");
      localStorage.removeItem("user_data");
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.login(email, password);
      localStorage.setItem("auth_token", response.data.token);
      
      // Store token expiry
      const expiryTime = Date.now() + (response.data.expires_in * 1000);
      localStorage.setItem("tokenExpiry", expiryTime.toString());
      
      // Store user data for offline access
      localStorage.setItem("user_data", JSON.stringify(response.data.user));
      
      setUser(response.data.user);
      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      const response = await api.signup(email, password, name);
      localStorage.setItem("auth_token", response.data.token);
      
      // Store token expiry
      const expiryTime = Date.now() + (response.data.expires_in * 1000);
      localStorage.setItem("tokenExpiry", expiryTime.toString());
      
      // Store user data for offline access
      localStorage.setItem("user_data", JSON.stringify(response.data.user));
      
      setUser(response.data.user);
      toast({
        title: "Account created!",
        description: "Welcome to Finance Tracker.",
      });
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Signup failed",
        description: error instanceof Error ? error.message : "Could not create account",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("tokenExpiry");
    localStorage.removeItem("user_data");
    setUser(null);
    navigate("/login");
    toast({
      title: "Logged out",
      description: "You've been successfully logged out.",
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
