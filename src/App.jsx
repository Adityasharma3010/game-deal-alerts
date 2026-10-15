import { useAuth } from "./hooks/useAuth";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import AuthScreen from "./components/AuthScreen";
import DashboardLayout from "./layouts/DashboardLayout";
import Overview from "./pages/Overview";
import MyGames from "./pages/MyGames";
import PriceHistory from "./pages/PriceHistory";
import AlertActivity from "./pages/AlertActivity";

function ProtectedLayout({ session }) {
  return <Outlet context={{ session }} />;
}

function AppRoutes() {
  const { session, loading: authLoading, error: authError } = useAuth();

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090b10] text-slate-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-emerald-400" />
          <p className="text-sm text-slate-400">
            Loading your GamePulse session...
          </p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <>
        {authError && (
          <p
            role="alert"
            className="fixed left-4 right-4 top-4 z-50 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300"
          >
            {authError}
          </p>
        )}
        <AuthScreen />
      </>
    );
  }

  return (
    <Routes>
      <Route element={<ProtectedLayout session={session} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Overview />} />
          <Route path="my-games" element={<MyGames />} />
          <Route path="price-history" element={<PriceHistory />} />
          <Route path="alert-activity" element={<AlertActivity />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
