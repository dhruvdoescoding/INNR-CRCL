"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, Users, User } from "lucide-react";

const NAV_ITEMS = [
  { icon: Home,          label: "Feed",    href: "/feed"       },
  { icon: MessageCircle, label: "Chat",    href: "/chat"       },
  { icon: Users,         label: "Friends", href: "/friends"    },
  { icon: User,          label: "Profile", href: "/profile/me" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-around px-2 pb-safe"
      style={{
        background:     "rgba(13,13,26,0.85)",
        backdropFilter: "blur(20px)",
        borderTop:      "1px solid rgba(167,139,250,0.12)",
        paddingTop:     "0.75rem",
        paddingBottom:  "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 px-4 transition-all duration-150"
            style={{
              color:     active ? "#7C3AED" : "#6B7280",
              filter:    active ? "drop-shadow(0 0 6px rgba(124,58,237,0.7))" : "none",
              minWidth:  "56px",
            }}
          >
            <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
