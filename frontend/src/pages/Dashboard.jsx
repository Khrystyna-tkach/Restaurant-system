import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Clock3,
  DollarSign,
  FolderPlus,
  Info,
  ListChecks,
  Package,
  ShoppingBasket,
  Table2,
  Utensils,
} from "lucide-react";
import { api } from "../api/api";

const orderStatusLabels = {
  new: "Новий",
  cooking: "Готується",
  ready: "Готовий",
  paid: "Оплачено",
  cancelled: "Скасовано",
};

const orderStatusClasses = {
  new: "bg-orange-50 text-orange-600",
  cooking: "bg-amber-50 text-amber-700",
  ready: "bg-green-50 text-green-700",
  paid: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-50 text-red-700",
};

const fallbackAdminStats = {
  generatedAt: new Date().toISOString(),
  tables: { total: 0, free: 0, occupied: 0 },
  dishes: { total: 0, active: 0, inactive: 0 },
  categories: { total: 0 },
  orders: { total: 0, active: 0, today: 0, statusCounts: {}, recent: [] },
  revenue: { today: 0, week: 0, chart: [] },
};

const fallbackChefStats = {
  generatedAt: new Date().toISOString(),
  summary: { new: 0, cooking: 0, ready: 0, total: 0 },
  orders: { current: [], new: [], cooking: [], ready: [] },
  ingredients: { lowStock: [], total: 0, available: 0, low: 0, out: 0 },
  notifications: [],
};

const fallbackWaiterStats = {
  generatedAt: new Date().toISOString(),
  waiter: null,
  summary: { myTables: 0, new: 0, cooking: 0, ready: 0, total: 0 },
  orders: { recent: [], active: [], new: [], cooking: [], ready: [] },
  tables: { active: [] },
};

const formatMoney = (value) =>
  new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 }).format(value || 0);

const formatTime = (value) =>
  new Date(value).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });

export default function Dashboard() {
  const role = localStorage.getItem("role") || "ADMIN";

  if (role === "CHEF") return <ChefDashboard />;
  if (role === "ADMIN") return <AdminDashboard />;
  if (role === "WAITER") return <WaiterDashboard />;

  return (
    <section className="rounded-2xl bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold text-orange-600">Restaurant System</p>
      <h1 className="mt-2 text-3xl font-bold text-gray-900">Вітаємо!</h1>
      <p className="mt-2 text-gray-500">Для вашої ролі основна робота знаходиться у меню, столах та замовленнях.</p>
    </section>
  );
}

function ChefDashboard() {
  const navigate = useNavigate();
  const firstLetter = "К";
  const [stats, setStats] = useState(fallbackChefStats);
  const [activeTab, setActiveTab] = useState("new");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const response = await api.get("/dashboard/chef");
        setStats(response.data);
        setError("");
      } catch (err) {
        setError(err.response?.data?.message || "Не вдалося завантажити дашборд кухаря");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("uk-UA", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(stats.generatedAt || Date.now())),
    [stats.generatedAt],
  );

  const currentOrders =
    activeTab === "new"
      ? stats.orders.new
      : activeTab === "cooking"
        ? stats.orders.cooking
        : activeTab === "ready"
          ? stats.orders.ready
          : stats.orders.current;

  const tabs = [
    { id: "new", label: "Нові", count: stats.summary.new },
    { id: "cooking", label: "Готуються", count: stats.summary.cooking },
    { id: "ready", label: "Готові", count: stats.summary.ready },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-950">Вітаємо, кухарю!</h1>
          <p className="mt-2 text-gray-500">Ось що відбувається на кухні сьогодні.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm">
            <Clock3 className="h-5 w-5 text-gray-500" />
            {today}
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-stone-600 text-lg font-bold text-white">
            {firstLetter}
          </div>
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-2xl bg-white p-8 text-gray-500 shadow-sm">Завантаження кухні...</div>
      ) : (
        <>
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <ChefStat icon={ChefHat} title="Нові замовлення" value={stats.summary.new} helper="потребують уваги" warm />
            <ChefStat icon={ShoppingBasket} title="Готуються" value={stats.summary.cooking} helper="у процесі" yellow />
            <ChefStat icon={CheckCircle2} title="Готові до видачі" value={stats.summary.ready} helper="очікують видачі" green />
            <ChefStat icon={CalendarDays} title="Усі замовлення" value={stats.summary.total} helper="за сьогодні" />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.25fr_0.85fr]">
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-gray-950">Поточні замовлення</h2>
                <button onClick={() => navigate("/menu")} className="font-bold text-orange-500 hover:text-orange-600">
                  Переглянути всі
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-8 border-b border-gray-100">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-4 font-bold ${
                      activeTab === tab.id ? "border-b-2 border-orange-400 text-orange-500" : "text-gray-600"
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse">
                  <thead>
                    <tr className="text-left text-sm text-gray-500">
                      <th className="py-3">№ замовлення</th>
                      <th>Час</th>
                      <th>Стіл</th>
                      <th>Страви</th>
                      <th>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentOrders.slice(0, 5).map((order) => (
                      <tr key={order.id} className="border-t border-gray-100 text-sm">
                        <td className="py-4 font-bold text-gray-950">#{order.id}</td>
                        <td className="font-semibold text-gray-600">{formatTime(order.createdAt)}</td>
                        <td className="font-semibold text-gray-600">Стіл {order.table?.number || order.tableId}</td>
                        <td className="text-gray-500">{order.items?.length || 0} страви</td>
                        <td>
                          <OrderBadge status={order.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {currentOrders.length === 0 && <p className="py-8 text-center text-sm text-gray-500">Немає замовлень у цьому статусі.</p>}
              </div>

              <button
                onClick={() => navigate("/menu")}
                className="mt-4 w-full rounded-xl border border-gray-100 px-4 py-3 font-bold text-gray-700 hover:bg-gray-50"
              >
                Переглянути всі замовлення
              </button>
            </section>

            <KitchenStatusChart summary={stats.summary} />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-gray-950">Запаси інгредієнтів</h2>
                <button onClick={() => navigate("/ingredients")} className="font-bold text-orange-500 hover:text-orange-600">
                  Переглянути всі
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {stats.ingredients.lowStock.slice(0, 5).map((ingredient) => (
                  <div key={ingredient.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <IngredientEmoji ingredient={ingredient} />
                      <span className="font-semibold text-gray-700">{ingredient.name}</span>
                    </div>
                    <strong>{ingredient.quantity} {ingredient.unit}</strong>
                    <span className={`rounded-lg px-3 py-1 text-xs font-bold ${ingredient.status === "out" ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"}`}>
                      {ingredient.status === "out" ? "Немає" : "Мало"}
                    </span>
                  </div>
                ))}
                {stats.ingredients.lowStock.length === 0 && <p className="text-sm text-gray-500">Усі інгредієнти в нормі.</p>}
              </div>

              <button
                onClick={() => navigate("/ingredients")}
                className="mt-6 w-full rounded-xl border border-gray-100 px-4 py-3 font-bold text-gray-700 hover:bg-gray-50"
              >
                Переглянути всі інгредієнти
              </button>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-gray-950">Сповіщення</h2>
                <button onClick={() => navigate("/ingredients")} className="font-bold text-orange-500 hover:text-orange-600">
                  Переглянути всі
                </button>
              </div>

              <div className="mt-5 space-y-5">
                {stats.notifications.map((notification, index) => (
                  <NotificationItem key={`${notification.title}-${index}`} notification={notification} />
                ))}
                {stats.notifications.length === 0 && <p className="text-sm text-gray-500">Нових сповіщень немає.</p>}
              </div>
            </section>
          </section>
        </>
      )}
    </div>
  );
}

function WaiterDashboard() {
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "Офіціант";
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "О";
  const [stats, setStats] = useState(fallbackWaiterStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const response = await api.get("/dashboard/waiter");
        setStats(response.data);
        setError("");
      } catch (err) {
        setError(err.response?.data?.message || "Не вдалося завантажити дашборд офіціанта");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const today = useMemo(() => {
    return new Intl.DateTimeFormat("uk-UA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(stats.generatedAt || Date.now()));
  }, [stats.generatedAt]);

  const firstName = stats.waiter?.firstName || userName.split(" ")[0] || "Офіціанте";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-950">Вітаємо, {firstName}!</h1>
          <p className="mt-2 text-gray-500">Швидкий доступ до ваших столів та замовлень.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm">
            <CalendarDays className="h-5 w-5 text-gray-500" />
            {today}
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-stone-600 text-lg font-bold text-white">
            {initials}
          </div>
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-2xl bg-white p-8 text-gray-500 shadow-sm">Завантаження дашборда офіціанта...</div>
      ) : (
        <>
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <WaiterStat dark icon={Table2} title="Мої столи" value={stats.summary.myTables} helper="активних" />
            <WaiterStat icon={ListChecks} title="Нові замовлення" value={stats.summary.new} helper="очікують" />
            <WaiterStat warm icon={ChefHat} title="Готуються" value={stats.summary.cooking} helper="на кухні" />
            <WaiterStat dark icon={CheckCircle2} title="Готові до видачі" value={stats.summary.ready} helper="очікують на вас" />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.05fr_0.85fr]">
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-gray-950">Мої замовлення</h2>
                <button onClick={() => navigate("/orders")} className="font-bold text-orange-500 hover:text-orange-600">
                  Переглянути всі
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {stats.orders.recent.slice(0, 5).map((order) => (
                  <div key={order.id} className="grid grid-cols-[80px_1fr_70px_90px_110px] items-center gap-3 border-b border-gray-100 pb-4 text-sm last:border-0 last:pb-0">
                    <strong className="text-orange-700">#{order.id}</strong>
                    <span className="font-semibold text-gray-500">Столик {order.table?.number || order.tableId}</span>
                    <span className="font-semibold text-gray-500">{formatTime(order.createdAt)}</span>
                    <strong className="text-amber-800">{formatMoney(order.total)} грн</strong>
                    <OrderBadge status={order.status} />
                  </div>
                ))}
                {stats.orders.recent.length === 0 && <p className="text-sm text-gray-500">Ваших замовлень за сьогодні ще немає.</p>}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-gray-950">Швидкі дії</h2>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <WaiterAction icon={Utensils} label="Нове замовлення" onClick={() => navigate("/menu")} />
                <WaiterAction icon={Table2} label="Вибрати стіл" onClick={() => navigate("/tables")} />
                <WaiterAction icon={ListChecks} label="Переглянути меню" onClick={() => navigate("/menu")} />
              </div>
            </section>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-950">Мої активні столи</h2>
              <button onClick={() => navigate("/tables")} className="font-bold text-orange-500 hover:text-orange-600">
                Переглянути всі
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {stats.tables.active.slice(0, 6).map((table) => (
                <article key={table.id} className="rounded-2xl bg-gray-50 p-5">
                  <h3 className="font-bold text-gray-950">Столик {table.number}</h3>
                  <p className="mt-5 text-sm text-gray-500">{table.capacity || 0} гостя</p>
                  <p className="text-sm text-gray-500">{formatTime(table.createdAt)}</p>
                  <div className="mt-4">
                    <OrderBadge status={table.status} />
                  </div>
                </article>
              ))}
            </div>

            {stats.tables.active.length === 0 && <p className="mt-6 text-sm text-gray-500">Активних столів поки немає.</p>}
          </section>

          <p className="text-center text-sm text-gray-400">© 2024 Restaurant System. Усі права захищені.</p>
        </>
      )}
    </div>
  );
}

function WaiterStat({ icon: Icon, title, value, helper, dark = false, warm = false }) {
  const className = dark ? "bg-stone-700 text-white" : warm ? "bg-orange-50 text-orange-600" : "bg-stone-100 text-gray-950";

  return (
    <article className={`rounded-2xl p-7 shadow-sm ${className}`}>
      <div className="flex items-start gap-5">
        <Icon className="h-9 w-9" strokeWidth={1.7} />
        <div>
          <p className={`font-bold ${dark ? "text-white/85" : ""}`}>{title}</p>
          <p className="mt-4 text-4xl font-bold">{value}</p>
          <p className={`mt-3 text-sm font-bold ${dark ? "text-white/75" : "text-gray-500"}`}>{helper}</p>
        </div>
      </div>
    </article>
  );
}

function WaiterAction({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-32 flex-col items-center justify-center gap-4 rounded-2xl bg-gray-50 p-4 text-center font-bold text-gray-800 transition hover:bg-orange-50 hover:text-orange-600"
    >
      <Icon className="h-10 w-10" strokeWidth={1.6} />
      <span>{label}</span>
    </button>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "Адміністратор";
  const firstLetter = userName.trim().charAt(0).toUpperCase() || "A";
  const [stats, setStats] = useState(fallbackAdminStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const response = await api.get("/dashboard/admin");
        setStats(response.data);
        setError("");
      } catch (err) {
        setError(err.response?.data?.message || "Не вдалося завантажити дашборд");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const today = useMemo(() => {
    return new Intl.DateTimeFormat("uk-UA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(stats.generatedAt || Date.now()));
  }, [stats.generatedAt]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-950">Вітаємо, Адміністраторе!</h1>
          <p className="mt-2 text-gray-500">Ось що відбувається у вашому ресторані сьогодні.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm">
            <CalendarDays className="h-5 w-5 text-gray-400" />
            {today}
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-stone-600 text-lg font-bold text-white shadow-sm">{firstLetter}</div>
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      {loading ? (
        <div className="rounded-2xl bg-white p-8 text-gray-500 shadow-sm">Завантаження статистики...</div>
      ) : (
        <>
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <AdminStat dark icon={ClipboardList} label="Замовлень сьогодні" value={stats.orders.today} helper={`${stats.orders.active} активні`} />
            <AdminStat icon={Utensils} label="Страв у меню" value={stats.dishes.total} helper={`${stats.dishes.active} активні`} />
            <AdminStat dark icon={Table2} label="Активних столів" value={stats.tables.occupied} helper={`з ${stats.tables.total}`} />
            <AdminStat accent icon={DollarSign} label="Виручка сьогодні" value={`${formatMoney(stats.revenue.today)} грн`} helper="лише оплачені замовлення" />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.08fr_1fr]">
            <AdminRecentOrders orders={stats.orders.recent} navigate={navigate} />
            <RevenueChart revenue={stats.revenue} />
          </section>

          <section className="grid gap-5 md:grid-cols-3">
            <MiniMetric title="Вільні столики" value={stats.tables.free} icon={Table2} />
            <MiniMetric title="Категорій меню" value={stats.categories.total} icon={FolderPlus} />
            <MiniMetric title="Виручка за 7 днів" value={`${formatMoney(stats.revenue.week)} грн`} icon={BarChart3} />
          </section>

        </>
      )}
    </div>
  );
}

function ChefStat({ icon: Icon, title, value, helper, warm = false, yellow = false, green = false }) {
  const className = warm ? "bg-orange-50 text-orange-500" : yellow ? "bg-amber-50 text-amber-500" : green ? "bg-green-50 text-green-600" : "bg-white text-gray-700";
  return (
    <article className={`rounded-2xl p-7 shadow-sm ${className}`}>
      <div className="flex items-start gap-5">
        <Icon className="h-9 w-9" strokeWidth={1.7} />
        <div>
          <p className="font-bold">{title}</p>
          <p className="mt-4 text-4xl font-bold text-gray-950">{value}</p>
          <p className="mt-3 text-sm font-bold text-gray-500">{helper}</p>
        </div>
      </div>
    </article>
  );
}

function KitchenStatusChart({ summary }) {
  const total = Math.max(summary.total, 1);
  const newPercent = (summary.new / total) * 100;
  const cookingPercent = (summary.cooking / total) * 100;
  const readyPercent = (summary.ready / total) * 100;
  const gradient = `conic-gradient(#f28a2e 0 ${newPercent}%, #f6c84c ${newPercent}% ${newPercent + cookingPercent}%, #5f985b ${newPercent + cookingPercent}% ${newPercent + cookingPercent + readyPercent}%, #e5e7eb 0)`;

  const rows = [
    ["Нові", summary.new, "#f28a2e"],
    ["Готуються", summary.cooking, "#f6c84c"],
    ["Готові", summary.ready, "#5f985b"],
  ];

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-gray-950">Статус приготування</h2>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-8">
        <div className="grid h-44 w-44 place-items-center rounded-full" style={{ background: gradient }}>
          <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center">
            <div>
              <p className="text-sm font-semibold text-gray-500">Усього</p>
              <p className="text-3xl font-bold text-gray-950">{summary.total}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {rows.map(([label, value, color]) => (
            <div key={label} className="flex min-w-48 items-center justify-between gap-5 text-sm">
              <span className="flex items-center gap-2 font-semibold text-gray-600">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </span>
              <strong>{value} ({Math.round((value / total) * 100)}%)</strong>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-8 text-sm font-semibold text-gray-500">
        Середній час приготування: <span className="text-orange-500">18 хв</span>
      </p>
    </section>
  );
}

function IngredientEmoji({ ingredient }) {
  const icons = {
    Овочі: "🥬",
    "М'ясо": "🥩",
    "Молочні продукти": "🧀",
    Бакалія: "🥣",
    "Спеції та приправи": "🌿",
  };
  return <span className="grid h-10 w-10 place-items-center rounded-xl bg-gray-50 text-xl">{ingredient.image || icons[ingredient.category] || "📦"}</span>;
}

function NotificationItem({ notification }) {
  const Icon = notification.type === "danger" ? AlertTriangle : notification.type === "warning" ? AlertTriangle : Info;
  const className = notification.type === "danger" ? "bg-red-50 text-red-500" : notification.type === "warning" ? "bg-amber-50 text-amber-500" : "bg-blue-50 text-blue-500";

  return (
    <div className="flex items-start gap-4">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${className}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-gray-950">{notification.title}</p>
        <p className="mt-1 text-sm text-gray-500">{notification.text}</p>
      </div>
    </div>
  );
}

function OrderBadge({ status }) {
  return <span className={`rounded-lg px-3 py-1 text-xs font-bold ${orderStatusClasses[status] || "bg-gray-100 text-gray-600"}`}>{orderStatusLabels[status] || status}</span>;
}

function AdminStat({ icon: Icon, label, value, helper, dark = false, accent = false }) {
  const className = accent ? "bg-orange-400 text-white" : dark ? "bg-stone-700 text-white" : "bg-stone-100 text-gray-950";
  return (
    <article className={`rounded-2xl p-6 shadow-sm ${className}`}>
      <div className="flex items-start gap-5">
        <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${dark || accent ? "bg-white/12" : "bg-white"}`}>
          <Icon className="h-8 w-8" strokeWidth={1.6} />
        </div>
        <div>
          <p className={`font-bold ${dark || accent ? "text-white/90" : "text-gray-700"}`}>{label}</p>
          <p className="mt-3 text-4xl font-bold tracking-normal">{value}</p>
          <p className={`mt-3 text-sm font-bold ${dark || accent ? "text-white/75" : "text-gray-500"}`}>{helper}</p>
        </div>
      </div>
    </article>
  );
}

function AdminRecentOrders({ orders, navigate }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-950">Останні замовлення</h2>
        <button type="button" onClick={() => navigate("/orders")} className="font-bold text-orange-500 transition hover:text-orange-600">Переглянути всі</button>
      </div>
      <div className="mt-6 space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="grid grid-cols-[80px_1fr_70px_90px_110px] items-center gap-3 border-b border-gray-100 pb-4 text-sm last:border-0 last:pb-0">
            <strong className="text-gray-950">#{order.id}</strong>
            <span className="text-gray-500">Столик {order.table?.number || order.tableId}</span>
            <span className="text-gray-500">{formatTime(order.createdAt)}</span>
            <strong className="text-gray-900">{formatMoney(order.total)} грн</strong>
            <OrderBadge status={order.status} />
          </div>
        ))}
        {orders.length === 0 && <p className="text-sm text-gray-500">Замовлень поки немає.</p>}
      </div>
    </section>
  );
}

function RevenueChart({ revenue }) {
  const chart = revenue.chart?.length ? revenue.chart : [];
  const maxValue = Math.max(...chart.map((day) => day.total), 1);
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-gray-950">Виручка за тиждень</h2>
      <div className="mt-8 flex h-56 items-end gap-4 border-b border-gray-100 px-2">
        {chart.map((day, index) => {
          const height = Math.max((day.total / maxValue) * 100, day.total ? 12 : 4);
          const isToday = index === chart.length - 1;
          return (
            <div key={day.key} className="flex flex-1 flex-col items-center gap-3">
              <div className="flex h-44 w-full items-end">
                <div className={`w-full rounded-t-lg ${isToday ? "bg-orange-400" : "bg-slate-800"}`} style={{ height: `${height}%` }} />
              </div>
              <span className="text-sm font-semibold text-gray-500">{day.label}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-500">Загальна виручка</p>
          <p className="mt-2 text-3xl font-bold text-gray-950">{formatMoney(revenue.week)} грн</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-500">Сьогодні</p>
          <p className="mt-2 text-xl font-bold text-orange-500">{formatMoney(revenue.today)} грн</p>
        </div>
      </div>
    </section>
  );
}

function MiniMetric({ icon: Icon, title, value }) {
  return (
    <article className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-orange-100 text-orange-600">
        <Icon className="h-6 w-6" strokeWidth={1.8} />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-950">{value}</p>
      </div>
    </article>
  );
}
