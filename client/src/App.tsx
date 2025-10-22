import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import AICover from "./pages/AICover";
import VoiceCoverCreate from "./pages/VoiceCoverCreate";
import SongDetail from "./pages/SongDetail";
import Songs from "./pages/Songs";

function Router() {
  return (
    <Layout>
      <Switch>        <Route path={"/"} component={Home} />
        <Route path={"/song/:id"} component={SongDetail} />
        <Route path={"/featured"} component={Home} />
        <Route path="/ai-cover" component={AICover} />
        <Route path="/ai-cover/:voiceId" component={VoiceCoverCreate} />
        <Route path={"/songs"} component={Songs} />
        <Route path={"/vibes"} component={Home} />
        <Route path={"/playlists"} component={Home} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
