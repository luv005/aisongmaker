
import { Music, Home, Mic2, ListMusic, Music2, List, Bell, User, Settings, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout(props: LayoutProps) {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  
  const getUserInitial = () => {
    if (!user?.name) return "U";
    return user.name.charAt(0).toUpperCase();
  };

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
        <div className="p-6 border-b border-border/50">
          <Link href="/">
            <div className="flex items-center gap-3 text-xl font-bold cursor-pointer group">
              <div className="p-2 rounded-xl gradient-accent glow transition-all duration-300 group-hover:scale-110">
                <Music className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">AI Song Maker</span>
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
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-border flex items-center justify-end px-6 gap-4">
          {isAuthenticated ? (
            <>
              {/* Notification Bell */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>
              
              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-10 w-10 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                  >
                    {getUserInitial()}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>View Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = '/subscription'}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Manage Subscription</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Menu Button */}
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" asChild>
                <a href={getLoginUrl()}>Log In</a>
              </Button>
              <Button asChild className="bg-primary hover:bg-primary/90">
                <a href={getLoginUrl()}>Sign Up</a>
              </Button>
            </>
          )}
        </header>
        
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {props.children}
        </div>
      </main>
    </div>
  );
}

