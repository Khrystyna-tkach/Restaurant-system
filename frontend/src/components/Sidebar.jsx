import { NavLink, useNavigate } from "react-router-dom";
import {
  ChefHat,
  ClipboardList,
  Folder,
  Grid2X2,
  LogOut,
  Package,
  ShieldCheck,
  Table2,
  Utensils,
} from "lucide-react";

const roleLabels = {
  ADMIN: "Адміністратор",
  WAITER: "Офіціант",
  CHEF: "Кухар",
};

const roleIcons = {
  ADMIN: ShieldCheck,
  WAITER: ClipboardList,
  CHEF: ChefHat,
};

const linksByRole = {
  ADMIN: [
    { to: "/", label: "Дашборд", icon: Grid2X2 },
    { to: "/orders", label: "Замовлення", icon: ClipboardList },
    { to: "/menu", label: "Страви", icon: Utensils },
    { to: "/categories", label: "Категорії", icon: Folder },
    { to: "/tables", label: "Столи", icon: Table2 },
  ],
  WAITER: [
    { to: "/", label: "Дашборд", icon: Grid2X2 },
    { to: "/orders", label: "Замовлення", icon: ClipboardList },
    { to: "/menu", label: "Страви", icon: Utensils },
    { to: "/tables", label: "Столи", icon: Table2 },
  ],
  CHEF: [
    { to: "/", label: "Дашборд", icon: Grid2X2 },
    { to: "/ingredients", label: "Інгредієнти", icon: Package },
    { to: "/menu", label: "Кухня", icon: ChefHat },
  ],
};

export default function Sidebar() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role") || "ADMIN";
  const roleLabel = roleLabels[role] || roleLabels.ADMIN;
  const RoleIcon = roleIcons[role] || ShieldCheck;
  const links = linksByRole[role] || linksByRole.ADMIN;

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    navigate("/login");
  };

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-hidden bg-gradient-to-b from-stone-700 via-stone-800 to-slate-900 text-white shadow-xl">
      <div className="px-8 py-8">
        <div className="flex items-center gap-3 text-white">
          <Utensils className="h-8 w-8 text-stone-100" strokeWidth={1.7} />
          <span className="text-base font-bold">Restaurant System</span>
        </div>
      </div>

      <div className="px-8 pb-7">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-orange-400 shadow-lg">
            <RoleIcon className="h-7 w-7" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold">{roleLabel}</p>
            <p className="text-sm text-stone-300">{roleLabel}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-4 px-8 py-4 text-base font-semibold transition ${
                isActive ? "bg-orange-400 text-white shadow-inner" : "text-stone-200 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <Icon className="h-6 w-6" strokeWidth={1.7} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-8 py-8">
        <button
          type="button"
          onClick={logout}
          className="m-0 flex w-full items-center gap-4 rounded-xl bg-transparent p-0 text-base font-semibold text-stone-200 transition hover:text-white"
        >
          <LogOut className="h-6 w-6" strokeWidth={1.7} />
          <span>Вийти</span>
        </button>
      </div>
    </aside>
  );
}
