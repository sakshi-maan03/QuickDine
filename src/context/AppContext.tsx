/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../lib/api";

interface UserType { _id: string; name: string; email: string; phone?: string; role: "user" | "admin" | "owner" }
interface AppContextType {
    user: UserType | null; token: string | null; loading: boolean; isAuthenticated: boolean;
    isAuthModalOpen: boolean; setAuthModalOpen: (open: boolean) => void;
    login: (email: string, password: string) => Promise<boolean>;
    register: (name: string, email: string, password: string, phone?: string, role?: string) => Promise<boolean>;
    logout: () => void;
}
const AppContext = createContext<AppContextType | null>(null);
export const AppContextProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<UserType | null>(null);
    const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
    const [loading, setLoading] = useState(true);
    const [isAuthModalOpen, setAuthModalOpen] = useState(false);
    const saveSession = (nextToken: string, nextUser: UserType) => {
        localStorage.setItem("token", nextToken); setToken(nextToken); setUser(nextUser);
    };
    const login = async (email: string, password: string) => {
        try { const { data } = await api.post("/auth/login", { email, password }); saveSession(data.token, data.user); return true; }
        catch (error: any) { console.error(error?.response?.data?.message || "Login failed"); return false; }
    };
    const register = async (name: string, email: string, password: string, phone?: string, role?: string) => {
        try { const { data } = await api.post("/auth/register", { name, email, password, phone, role }); saveSession(data.token, data.user); return true; }
        catch (error: any) { console.error(error?.response?.data?.message || "Registration failed"); return false; }
    };
    const logout = () => { localStorage.removeItem("token"); setToken(null); setUser(null); window.location.href = "/"; };
    useEffect(() => {
        let active = true;
        const loadUser = async () => {
            if (!token) { if (active) setLoading(false); return; }
            try { const { data } = await api.get("/auth/me"); if (active) setUser(data.user); }
            catch { localStorage.removeItem("token"); if (active) { setToken(null); setUser(null); } }
            finally { if (active) setLoading(false); }
        };
        setLoading(true); void loadUser();
        return () => { active = false; };
    }, [token]);
    return <AppContext.Provider value={{ user, token, loading, isAuthenticated: !!user, isAuthModalOpen, setAuthModalOpen, login, register, logout }}>{children}</AppContext.Provider>;
};
export const useAppContext = () => { const context = useContext(AppContext); if (!context) throw new Error("useAppContext must be used within AppContextProvider"); return context; };
