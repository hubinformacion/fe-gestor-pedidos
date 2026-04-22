"use client";

import { useEffect, useState } from "react";
import { LoginForm } from "@/components/dashboard/login-form";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function DashboardPage() {
  const [token, setToken] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check localStorage on mount
    const savedToken = localStorage.getItem("dashboard_token");
    if (savedToken) {
      setToken(savedToken);
    }
    setIsChecking(false);
  }, []);

  const handleLogin = (newToken: string) => {
    localStorage.setItem("dashboard_token", newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem("dashboard_token");
    setToken(null);
  };

  if (isChecking) {
    return <div className="flex h-screen w-full items-center justify-center">Cargando...</div>;
  }

  if (!token) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1">
        <DashboardShell token={token} onLogout={handleLogout} />
      </main>
    </div>
  );
}
