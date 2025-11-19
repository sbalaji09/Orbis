"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactElement } from "react";

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

  const isActive = (link: string) => {
    if (link === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(link);
  };

  return (
    <nav className="flex items-center justify-between w-full">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 group">
        <div className="w-8 h-8 bg-linear-to-br from-babyblue to-accent-teal rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
          <span className="text-white font-bold text-lg">O</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-semibold text-foreground leading-none">
            Orbis
          </span>
          <span className="text-[9px] text-slate/70 font-medium uppercase tracking-widest">
            Observability
          </span>
        </div>
      </Link>

      {/* Navigation Links */}
      <ul className="flex items-center gap-1">
        {navItems.map((item) => {
          const active = isActive(item.link);
          return (
            <li key={item.name}>
              <Link
                href={item.link}
                className={`relative px-3.5 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium ${
                  active
                    ? "text-babyblue bg-babyblue-light border border-babyblue/20"
                    : "text-slate hover:text-foreground hover:bg-slate/5"
                }`}
              >
                <span className="w-4 h-4">{item.icon}</span>
                <span>{item.name}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-accent-purple/10 text-accent-purple rounded-md border border-accent-purple/20 uppercase tracking-wide">
                    {item.badge}
                  </span>
                )}
                {active && (
                  <div className="absolute inset-x-1 -bottom-px h-0.5 bg-babyblue rounded-full" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
