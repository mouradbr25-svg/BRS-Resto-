import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Orders from "@/pages/orders";
import Tables from "@/pages/tables";
import Menu from "@/pages/menu";
import Inventory from "@/pages/inventory";
import Customers from "@/pages/customers";
import Quiz from "@/pages/quiz";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function ProtectedRoute({ component: Component, roles }: { component: React.ComponentType; roles?: string[] }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;
  if (roles && !roles.includes(user.role)) return <Redirect to="/dashboard" />;
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/orders">
        <ProtectedRoute component={Orders} />
      </Route>
      <Route path="/tables">
        <ProtectedRoute component={Tables} />
      </Route>
      <Route path="/menu">
        <ProtectedRoute component={Menu} />
      </Route>
      <Route path="/inventory">
        <ProtectedRoute component={Inventory} roles={["owner"]} />
      </Route>
      <Route path="/customers">
        <ProtectedRoute component={Customers} />
      </Route>
      <Route path="/quiz">
        <ProtectedRoute component={Quiz} roles={["owner"]} />
      </Route>
      <Route path="/analytics">
        <ProtectedRoute component={Analytics} roles={["owner"]} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} roles={["owner"]} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
