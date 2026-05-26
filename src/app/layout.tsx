import type { Metadata } from "next";

import { logoutAction } from "@/app/auth-actions";
import { Sidebar } from "@/components/layout/sidebar";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/app-branding";
import { getCurrentUser } from "@/lib/auth-session";
import { getModulesForRole } from "@/lib/modules";
import { canManageUsers, canViewResetRequests, getRoleLabel } from "@/lib/rbac";

import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  applicationName: APP_NAME,
  description: APP_DESCRIPTION
};

type RootLayoutProps = {
  children: React.ReactNode;
};

const themeInitScript = `
(() => {
  try {
    const theme = window.localStorage.getItem("bpma-theme");
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch (_error) {}
})();
`;

export default async function RootLayout({ children }: RootLayoutProps) {
  const user = await getCurrentUser();

  const modules = user ? getModulesForRole(user.perfil) : [];

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-[var(--background-page)] text-[var(--text-default)]">
        {!user ? (
          <main className="mx-auto min-h-screen w-full max-w-md p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-8">
            {children}
          </main>
        ) : (
          <div className="min-h-screen 2xl:flex">
            <Sidebar
              modules={modules}
              userName={user.nomeCompleto}
              userRoleLabel={getRoleLabel(user.perfil)}
              canManageUsers={canManageUsers(user.perfil)}
              canViewResetRequests={canViewResetRequests(user.perfil)}
              onLogout={logoutAction}
            />
            <main className="flex-1 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4 sm:pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-8">
              <div className="mx-auto w-full max-w-7xl">{children}</div>
            </main>
          </div>
        )}
      </body>
    </html>
  );
}
