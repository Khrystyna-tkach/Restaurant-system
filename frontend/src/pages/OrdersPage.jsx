import { useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  ListChecks,
  MoreHorizontal,
  Pencil,
  RefreshCcw,
  Search,
  ShoppingBasket,
} from "lucide-react";
import { api } from "../api/api";

const statusLabels = {
  new: "Нове",
  cooking: "Готується",
  ready: "Готове",
  paid: "Оплачено",
  cancelled: "Скасовано",
};

const statusDescriptions = {
  new: "Замовлення створено і очікує обробки",
  cooking: "Замовлення передано на кухню",
  ready: "Замовлення готове до видачі",
  paid: "Замовлення виконано та оплачено",
  cancelled: "Замовлення скасовано або закрито",
};

const statusClasses = {
  new: "bg-orange-50 text-orange-700",
  cooking: "bg-yellow-50 text-yellow-700",
  ready: "bg-green-50 text-green-700",
  paid: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-50 text-red-700",
};

const statusDotClasses = {
  new: "bg-orange-100",
  cooking: "bg-yellow-100",
  ready: "bg-green-100",
  paid: "bg-gray-200",
  cancelled: "bg-red-100",
};

const formatMoney = (value) => `${new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 }).format(value || 0)} грн`;

function getAllowedStatuses(role, currentStatus) {
  if (role === "ADMIN") return ["new", "cooking", "ready", "paid", "cancelled"];
  if (role === "WAITER" && currentStatus === "new") return ["new", "cooking"];
  if (role === "CHEF" && currentStatus === "cooking") return ["cooking", "ready"];
  return [currentStatus];
}

export default function OrdersPage() {
  const role = localStorage.getItem("role") || "ADMIN";
  const isAdmin = role === "ADMIN";

  if (!isAdmin) return <RoleOrdersPage role={role} />;

  return <AdminOrdersPage />;
}

function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [summary, setSummary] = useState({ total: 0, new: 0, cooking: 0, ready: 0, completed: 0 });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 8, total: 0, pageCount: 1 });
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    tableId: "all",
    date: "",
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadOrders = async (page = pagination.page) => {
    try {
      setLoading(true);
      const response = await api.get("/orders/admin", {
        params: {
          page,
          pageSize: pagination.pageSize,
          search: filters.search || undefined,
          status: filters.status,
          tableId: filters.tableId === "all" ? undefined : filters.tableId,
          date: filters.date || undefined,
        },
      });

      setOrders(response.data.orders);
      setTables(response.data.tables);
      setSummary(response.data.summary);
      setPagination(response.data.pagination);
    } catch (error) {
      setMessage(error.response?.data?.message || "Не вдалося завантажити замовлення");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(1);
  }, [filters.search, filters.status, filters.tableId, filters.date, pagination.pageSize]);

  const updateStatus = async (id, status) => {
    await api.patch(`/orders/${id}`, { status });
    setMessage(status === "paid" ? "Замовлення оплачено, виручку оновлено" : "Статус замовлення оновлено");
    loadOrders();
  };

  const deleteOrder = async (id) => {
    if (!window.confirm("Видалити це замовлення?")) return;
    await api.delete(`/orders/${id}`);
    setMessage("Замовлення видалено");
    loadOrders(1);
  };

  const resetFilters = () => {
    setFilters({ search: "", status: "all", tableId: "all", date: "" });
  };

  const statCards = [
    { label: "Усі замовлення", value: summary.total, helper: "за вибрану дату", icon: ListChecks, dark: true },
    { label: "Нові", value: summary.new, helper: "очікують обробки", icon: Clock3 },
    { label: "Готуються", value: summary.cooking, helper: "на кухні", icon: ShoppingBasket, warm: true },
    { label: "Готові", value: summary.ready, helper: "готові до видачі", icon: CheckCircle2 },
    { label: "Завершені", value: summary.completed, helper: "оплачені або закриті", icon: CheckCircle2, dark: true },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-950">Замовлення</h1>
        <p className="mt-2 text-gray-500">Перегляд та керування всіма замовленнями в ресторані.</p>
      </header>

      {message && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700">
          {message}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-5">
        {statCards.map((card) => (
          <OrderStatCard key={card.label} {...card} />
        ))}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1fr_160px_160px_190px_190px]">
          <label className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Пошук замовлення..."
              className="w-full border-0 py-3 outline-none"
            />
          </label>

          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            className="rounded-xl border border-gray-100 px-4 py-3 font-semibold text-gray-700"
          >
            <option value="all">Усі статуси</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={filters.tableId}
            onChange={(event) => setFilters((current) => ({ ...current, tableId: event.target.value }))}
            className="rounded-xl border border-gray-100 px-4 py-3 font-semibold text-gray-700"
          >
            <option value="all">Усі столи</option>
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                Столик {table.number}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 rounded-xl border border-gray-100 px-4 py-3 font-semibold text-gray-700">
            <CalendarDays className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={filters.date}
              onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}
              className="w-full border-0 outline-none"
            />
          </label>

          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-100 px-4 py-3 font-bold text-gray-700 transition hover:bg-gray-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Скинути фільтри
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-left text-sm text-gray-500">
                <th className="py-4">№ замовлення</th>
                <th>Стіл</th>
                <th>Офіціант</th>
                <th>Час</th>
                <th>Сума</th>
                <th>Статус</th>
                <th className="text-right">Дії</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onView={() => setSelectedOrder(order)}
                  onStatusChange={updateStatus}
                  onDelete={deleteOrder}
                />
              ))}
            </tbody>
          </table>

          {!loading && orders.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-500">За цими фільтрами замовлень немає.</p>
          )}
          {loading && <p className="py-10 text-center text-sm text-gray-500">Завантаження замовлень...</p>}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-gray-500">
          <span>
            Показано {orders.length ? (pagination.page - 1) * pagination.pageSize + 1 : 0}-
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} з {pagination.total} замовлень
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => loadOrders(pagination.page - 1)}
              className="rounded-xl border border-gray-100 px-4 py-2 font-bold disabled:opacity-40"
            >
              Назад
            </button>
            <span className="rounded-xl bg-orange-400 px-4 py-2 font-bold text-white">{pagination.page}</span>
            <button
              disabled={pagination.page >= pagination.pageCount}
              onClick={() => loadOrders(pagination.page + 1)}
              className="rounded-xl border border-gray-100 px-4 py-2 font-bold disabled:opacity-40"
            >
              Далі
            </button>
            <select
              value={pagination.pageSize}
              onChange={(event) =>
                setPagination((current) => ({ ...current, pageSize: Number(event.target.value), page: 1 }))
              }
              className="ml-3 rounded-xl border border-gray-100 px-3 py-2 font-bold text-gray-700"
            >
              <option value={8}>8 на сторінці</option>
              <option value={12}>12 на сторінці</option>
              <option value={20}>20 на сторінці</option>
            </select>
          </div>
        </div>
      </section>

      <StatusLegend />

      {selectedOrder && <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </div>
  );
}

function OrderStatCard({ icon: Icon, label, value, helper, dark = false, warm = false }) {
  const className = dark ? "bg-stone-700 text-white" : warm ? "bg-orange-50 text-gray-950" : "bg-white text-gray-950";
  const iconClassName = dark ? "bg-white/10 text-white" : warm ? "bg-orange-100 text-orange-500" : "bg-gray-50 text-gray-800";

  return (
    <article className={`rounded-2xl p-6 shadow-sm ${className}`}>
      <div className="flex items-start gap-4">
        <div className={`grid h-12 w-12 place-items-center rounded-xl ${iconClassName}`}>
          <Icon className="h-7 w-7" strokeWidth={1.7} />
        </div>
        <div>
          <p className={`text-sm font-bold ${dark ? "text-white/85" : "text-gray-600"}`}>{label}</p>
          <p className="mt-3 text-4xl font-bold">{value}</p>
          <p className={`mt-3 text-sm font-semibold ${dark ? "text-white/70" : "text-gray-500"}`}>{helper}</p>
        </div>
      </div>
    </article>
  );
}

function OrderRow({ order, onView, onStatusChange, onDelete }) {
  const waiterName = order.waiter ? `${order.waiter.firstName} ${order.waiter.lastName}` : "Не вказано";

  return (
    <tr className="border-b border-gray-100 text-sm last:border-0">
      <td className="py-5 font-bold text-gray-950">#{order.id}</td>
      <td className="font-semibold text-gray-700">Столик {order.table?.number || order.tableId}</td>
      <td className="text-gray-600">{waiterName}</td>
      <td className="font-semibold text-gray-700">
        {new Date(order.createdAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
      </td>
      <td className="font-bold text-gray-950">{formatMoney(order.total)}</td>
      <td>
        <span className={`rounded-lg px-3 py-2 text-xs font-bold ${statusClasses[order.status]}`}>
          {statusLabels[order.status]}
        </span>
      </td>
      <td>
        <div className="flex justify-end gap-2">
          <IconButton title="Переглянути" onClick={onView} icon={Eye} />
          <StatusSelect order={order} onStatusChange={onStatusChange} />
          <IconButton title="Позначити оплаченим" onClick={() => onStatusChange(order.id, "paid")} icon={Check} success />
          <IconButton title="Видалити" onClick={() => onDelete(order.id)} icon={MoreHorizontal} />
        </div>
      </td>
    </tr>
  );
}

function StatusSelect({ order, onStatusChange }) {
  return (
    <label className="relative grid h-10 w-10 place-items-center rounded-lg bg-gray-50 text-gray-700 transition hover:bg-gray-100">
      <Pencil className="pointer-events-none h-4 w-4" />
      <select
        value={order.status}
        onChange={(event) => onStatusChange(order.id, event.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        title="Змінити статус"
      >
        {getAllowedStatuses("ADMIN", order.status).map((status) => (
          <option key={status} value={status}>
            {statusLabels[status]}
          </option>
        ))}
      </select>
    </label>
  );
}

function IconButton({ icon: Icon, title, onClick, success = false }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`grid h-10 w-10 place-items-center rounded-lg transition ${
        success ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function StatusLegend() {
  return (
    <section className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-5">
      {["new", "cooking", "ready", "paid", "cancelled"].map((status) => (
        <div key={status} className="flex gap-3">
          <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${statusDotClasses[status]}`} />
          <div>
            <p className="font-bold text-gray-700">{statusLabels[status]}</p>
            <p className="mt-1 text-sm leading-5 text-gray-500">{statusDescriptions[status]}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

function OrderModal({ order, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <section className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-950">Замовлення #{order.id}</h2>
            <p className="mt-1 text-sm text-gray-500">
              Столик {order.table?.number || order.tableId} · {new Date(order.createdAt).toLocaleString("uk-UA")}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg bg-gray-100 px-3 py-2 font-bold text-gray-600">
            Закрити
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {order.items?.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
              <div>
                <p className="font-bold text-gray-900">{item.dish?.name || "Страва"}</p>
                <p className="text-sm text-gray-500">
                  {item.quantity} x {formatMoney(item.price)}
                </p>
              </div>
              <strong>{formatMoney(item.quantity * item.price)}</strong>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-between border-t border-gray-100 pt-4 text-lg font-bold">
          <span>Разом</span>
          <span>{formatMoney(order.total)}</span>
        </div>
      </section>
    </div>
  );
}

function RoleOrdersPage({ role }) {
  const [orders, setOrders] = useState([]);

  const loadOrders = async () => {
    const response = await api.get("/orders");
    setOrders(response.data);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const updateStatus = async (id, status) => {
    await api.patch(`/orders/${id}`, { status });
    loadOrders();
  };

  const visibleOrders = role === "CHEF" ? orders.filter((order) => ["cooking", "ready"].includes(order.status)) : orders;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-950">Замовлення</h1>
        <p className="mt-2 text-gray-500">
          {role === "WAITER"
            ? "Офіціант працює з новими та активними замовленнями."
            : "Кухар бачить замовлення на кухні та позначає їх готовими."}
        </p>
      </header>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="space-y-3">
          {visibleOrders.map((order) => {
            const allowedStatuses = getAllowedStatuses(role, order.status);

            return (
              <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-4">
                <div>
                  <p className="font-bold text-gray-950">Замовлення #{order.id}</p>
                  <p className="text-sm text-gray-500">Столик {order.table?.number || order.tableId}</p>
                </div>
                <select
                  value={order.status}
                  disabled={allowedStatuses.length === 1}
                  onChange={(event) => updateStatus(order.id, event.target.value)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold"
                >
                  {allowedStatuses.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
                <strong>{formatMoney(order.total)}</strong>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
