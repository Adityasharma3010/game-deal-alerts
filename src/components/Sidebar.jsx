import { NavLink } from "react-router-dom";
import GamePulseLogo from "./GamePulseLogo";

const navItems = [
  { icon: "◫", label: "Overview", to: "/" },
  { icon: "▦", label: "My Games", to: "/my-games" },
  { icon: "↗", label: "Price History", to: "/price-history" },
  { icon: "◷", label: "Alert Activity", to: "/alert-activity" },
];

export default function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/[0.07] bg-[#0c0e14] p-5 lg:flex lg:flex-col">
      <NavLink to="/" end className="mb-10 flex items-center gap-3">
        <GamePulseLogo size={42} />
      </NavLink>
      <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
        Workspace
      </p>
      <nav className="space-y-1" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${isActive ? "border border-emerald-400/15 bg-emerald-400/10 font-medium text-emerald-300" : "text-slate-400 hover:bg-white/[0.04] hover:text-white"}`
            }
          >
            <span className="text-lg" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="text-xs font-semibold text-slate-300">
            Setup in progress
          </span>
        </div>
        <p className="text-xs leading-5 text-slate-500">
          Price feeds and email delivery will be connected in a later stage.
        </p>
      </div>
    </aside>
  );
}
