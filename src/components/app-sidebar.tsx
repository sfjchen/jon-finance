"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard, ArrowLeftRight, Waves, CreditCard, TrendingUp, Landmark, Repeat, FileText, Settings, Wallet, Moon, Sun, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/cash-flow", label: "Cash flow", icon: Waves },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/cards", label: "Cards", icon: CreditCard },
  { href: "/investments", label: "Investments", icon: TrendingUp },
  { href: "/net-worth", label: "Net worth", icon: Landmark },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

const MOBILE = ["/", "/transactions", "/cards", "/investments", "/accounts"];

export function AppSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground sticky top-0 h-screen">
        <div className="px-5 py-5">
          <Link href="/" className="text-[15px] font-semibold tracking-tight">jon-finance</Link>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{email}</p>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13.5px] transition-colors",
                isActive(href) ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4" strokeWidth={1.75} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-3 border-t border-border flex items-center justify-between">
          <Button variant="ghost" size="icon-sm" aria-label="Toggle theme" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
            {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <form action="/auth/signout" method="post">
            <Button variant="ghost" size="sm" type="submit" className="text-muted-foreground">
              <LogOut className="size-4" /> Sign out
            </Button>
          </form>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-3 inset-x-3 z-40 rounded-xl border border-border bg-background/95 backdrop-blur shadow-sm flex justify-around py-1.5">
        {NAV.filter((n) => MOBILE.includes(n.href)).map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-label={label} className={cn("flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-11 text-[10px]", isActive(href) ? "text-foreground" : "text-muted-foreground")}>
            <Icon className="size-5" strokeWidth={1.75} />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
