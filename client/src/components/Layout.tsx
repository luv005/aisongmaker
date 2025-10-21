
import { Music, Home, Mic2, ListMusic, Music2, List } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout(props: LayoutProps) {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const navItems = [
    { label: "Featured", icon: Home, href: "/featured", section: "EXPLORE" },
    { label: "AI Music", icon: Music, href: "/", section: "CREATE" },
    { label: "AI Cover", icon: Mic2, href: "/ai-cover", section: "CREATE" },
    { label: "Songs", icon: ListMusic, href: "/songs", section: "LIBRARY" },
    { label: "Vibes", icon: Music2, href: "/vibes", section: "LIBRARY" },
    { label: "Playlists", icon: List, href: "/playlists", section: "LIBRARY" },
  ];

  let currentSection = "";

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-60 border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <Link href="/">
            <div className="flex items-center gap-2 text-xl font-bold cursor-pointer">
              <Music className="h-6 w-6 text-primary" />
              <span>Musicful</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          {navItems.map((item) => {
            const showSection = currentSection !== item.section;
            if (showSection) currentSection = item.section;
            const Icon = item.icon;
            const isActive = location === item.href;

            return (
              <div key={item.href}>
                {showSection && (
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-2 px-3">
                    {item.section}
                  </div>
                )}
                <Link href={item.href}>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 cursor-pointer ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          {isAuthenticated ? (
            <div className="px-3 py-2">
              <div className="text-sm font-medium">{user?.name}</div>
              <div className="text-xs text-muted-foreground">Credits: 0</div>
            </div>
          ) : (
            <a
              href={getLoginUrl()}
              className="block w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-center font-medium hover:bg-primary/90 transition-colors"
            >
              Subscribe
            </a>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {props.children}
      </main>
    </div>
  );
}

