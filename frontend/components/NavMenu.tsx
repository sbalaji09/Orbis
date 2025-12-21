"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactElement } from "react";
import { Logo } from "./Logo";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  icon: ReactElement;
  name: string;
  link: string;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    name: "Home",
    link: "/dashboard",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    name: "Traces",
    link: "/dashboard/trace",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    name: "Costs",
    link: "/dashboard/costs",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    name: "Evaluation",
    link: "/dashboard/evaluation",
    badge: "Soon",
  },
];

export default function NavMenu() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const isActive = (link: string) => {
    if (link === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(link);
  };

  return (
    <nav className="flex items-center justify-between w-full">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center group">
        {/* <div className="w-8 h-8 bg-mustard border-2 border-black flex items-center justify-center group-hover:shadow-[2px_2px_0_rgba(0,0,0,0.2)] transition-all">
          <span className="text-white font-bold text-lg">O</span>
        </div> */}
        <Logo className="w-12 h-12" />
        <div className="flex flex-col gap-0">
          <span className="text-base font-semibold tracking-tight leading-none">
            $ orbis.ai
          </span>
          <span className="text-[9px] text-black/40 font-medium uppercase tracking-wider">
            {`// observability`}
          </span>
        </div>
      </Link>

      {/* Navigation Links */}
      <div className="flex items-center gap-4">
        <ul className="flex items-center gap-1">
          {navItems.map((item) => {
            const active = isActive(item.link);
            return (
              <li key={item.name}>
                <Link
                  href={item.link}
                  className={`relative px-4 py-2 transition-all duration-200 flex items-center gap-2 text-sm font-medium border-2 ${
                    active
                      ? "bg-black text-mustard border-black"
                      : "bg-transparent text-black/60 border-transparent hover:text-foreground hover:bg-black/5"
                  }`}
                >
                  <span className="w-4 h-4">{item.icon}</span>
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-babyblue/10 text-babyblue border border-babyblue uppercase tracking-wide">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3 pl-3 border-l-2 border-black/10">
          <span className="text-xs text-black/50">{user?.email}</span>
          <button
            onClick={signOut}
            className="px-3 py-1.5 text-xs font-medium border-2 border-black/20 hover:border-black hover:bg-black hover:text-white transition-all"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
