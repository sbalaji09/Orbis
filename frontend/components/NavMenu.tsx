import Link from "next/link";
import { ReactElement } from "react";

interface NavItem {
  icon: ReactElement;
  name: string;
  link: string;
}
const navItems: NavItem[] = [
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="size-6"
      >
        <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
        <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
      </svg>
    ),
    name: "Home",
    link: "/dashboard",
  },
];

export default function NavMenu() {
  return (
    <nav className="flex items-center gap-6">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-mustard rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">O</span>
        </div>
        <span className="text-lg font-semibold text-foreground">Orbis</span>
      </div>
      <ul className="flex items-center gap-1">
        {navItems.map((item) => (
          <Link
            href={item.link}
            key={item.name}
            className="px-3 py-2 hover:bg-foreground/5 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium text-foreground/70 hover:text-foreground"
          >
            <span className="w-4 h-4">{item.icon}</span>
            {item.name}
          </Link>
        ))}
      </ul>
    </nav>
  );
}
