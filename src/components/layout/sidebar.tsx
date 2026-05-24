"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_DESCRIPTION, APP_NAME } from "@/lib/app-branding";
import type { AppModule } from "@/lib/modules";
import { ThemeToggleButton } from "./theme-toggle-button";

type SidebarProps = {
  modules: AppModule[];
  userName: string;
  userRoleLabel: string;
  canManageUsers: boolean;
  canViewResetRequests: boolean;
  onLogout: () => Promise<void>;
};

export function Sidebar({
  modules,
  userName,
  userRoleLabel,
  canManageUsers,
  canViewResetRequests,
  onLogout
}: SidebarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const navItems = modules.map((module) => {
    const isActive = pathname === module.href;

    return (
      <li key={module.href}>
        <Link
          href={module.href}
          className={`bpma-sidebar-link ${isActive ? "bpma-sidebar-link-active" : ""}`}
        >
          {module.name}
        </Link>
      </li>
    );
  });

  const userManagementNavItem = canManageUsers ? (
    <li>
      <Link
        href="/usuarios"
        className={`bpma-sidebar-link ${
          pathname.startsWith("/usuarios") && !pathname.startsWith("/usuarios/solicitacoes")
            ? "bpma-sidebar-link-active"
            : ""
        }`}
      >
        Gestão de Usuários
      </Link>
    </li>
  ) : null;

  const resetRequestsNavItem = canViewResetRequests ? (
    <li>
      <Link
        href="/usuarios/solicitacoes"
        className={`bpma-sidebar-link ${
          pathname.startsWith("/usuarios/solicitacoes")
            ? "bpma-sidebar-link-active"
            : ""
        }`}
      >
        Solicitações de Senha
      </Link>
    </li>
  ) : null;

  return (
    <>
      <aside className="bpma-sidebar w-full shrink-0 border-b md:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <Link href="/" className="block truncate text-base font-bold text-slate-900 dark:text-slate-100">
              {APP_NAME}
            </Link>
            <p className="truncate text-xs text-slate-500 dark:text-slate-300">
              {userName} • {userRoleLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="btn-secondary min-h-11 min-w-11 px-3"
            aria-expanded={mobileMenuOpen}
            aria-controls="bpma-mobile-sidebar-drawer"
          >
            {mobileMenuOpen ? "Fechar" : "Menu"}
          </button>
        </div>
      </aside>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50"
            aria-label="Fechar menu lateral"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside
            id="bpma-mobile-sidebar-drawer"
            className="bpma-sidebar absolute inset-y-0 left-0 w-[86%] max-w-xs overflow-y-auto border-r shadow-xl"
          >
            <div className="p-4">
              <Link href="/" className="block text-lg font-bold text-slate-900 dark:text-slate-100">
                {APP_NAME}
              </Link>
              <p className="mt-1 text-xs leading-4 text-slate-500 dark:text-slate-300">
                {APP_DESCRIPTION}
              </p>
              <div className="bpma-sidebar-user mt-3 rounded-lg px-3 py-2 text-xs">
                <p className="font-semibold text-slate-800 dark:text-slate-100">{userName}</p>
                <p className="text-slate-600 dark:text-slate-300">{userRoleLabel}</p>
              </div>
            </div>

            <nav className="px-3 pb-6">
              <ul className="space-y-1">
                {navItems}
                {userManagementNavItem}
                {resetRequestsNavItem}
              </ul>
              <div className="mt-4">
                <ThemeToggleButton compact />
              </div>
              <form action={onLogout} className="mt-4">
                <button type="submit" className="btn-secondary w-full">
                  Sair
                </button>
              </form>
            </nav>
          </aside>
        </div>
      ) : null}

      <aside className="bpma-sidebar hidden w-80 shrink-0 border-r md:min-h-screen md:block">
        <div className="p-6">
          <Link href="/" className="block text-xl font-bold text-slate-900 dark:text-slate-100">
            {APP_NAME}
          </Link>
          <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-300">
            {APP_DESCRIPTION}
          </p>
          <div className="bpma-sidebar-user mt-4 rounded-lg px-3 py-2 text-xs">
            <p className="font-semibold text-slate-800 dark:text-slate-100">{userName}</p>
            <p className="text-slate-600 dark:text-slate-300">{userRoleLabel}</p>
          </div>
        </div>

        <nav className="px-3 pb-6">
          <ul className="space-y-1">
            {navItems}
            {userManagementNavItem}
            {resetRequestsNavItem}
          </ul>
          <div className="mt-4">
            <ThemeToggleButton compact />
          </div>
          <form action={onLogout} className="mt-4">
            <button type="submit" className="btn-secondary w-full">
              Sair
            </button>
          </form>
        </nav>
      </aside>
    </>
  );
}
