import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, CheckCircle2, ChefHat, Clock3, ClipboardList, Pencil, Plus, Search, ShoppingBasket, Trash2, Utensils } from "lucide-react";
import { api } from "../api/api";

const emptyDishForm = {
  id: null,
  name: "",
  price: "",
  categoryName: "",
  image: "",
  available: true,
};

const orderStatusLabels = {
  new: "Нове",
  cooking: "Готується",
  ready: "Готово",
  paid: "Оплачено",
  cancelled: "Скасовано",
};

export default function MenuPage() {
  const role = localStorage.getItem("role") || "ADMIN";
  const isAdmin = role === "ADMIN";
  const isWaiter = role === "WAITER";
  const isChef = role === "CHEF";

  const [dishes, setDishes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [cart, setCart] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dishForm, setDishForm] = useState(emptyDishForm);
  const [message, setMessage] = useState("");

  const loadDishes = async () => {
    const response = await api.get("/dishes");
    setDishes(response.data);
  };

  const loadOrders = async () => {
    const response = await api.get("/orders");
    setOrders(response.data);
  };

  const loadTables = async () => {
    if (!isWaiter) return;
    const response = await api.get("/tables");
    setTables(response.data);
  };

  useEffect(() => {
    loadDishes();
    if (isWaiter || isChef) loadOrders();
    loadTables();
  }, [role]);

  const filteredDishes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return dishes.filter((dish) => {
      const matchesSearch =
        !normalizedSearch ||
        dish.name.toLowerCase().includes(normalizedSearch) ||
        dish.category?.name?.toLowerCase().includes(normalizedSearch);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && dish.available) ||
        (statusFilter === "inactive" && !dish.available);

      return matchesSearch && matchesStatus;
    });
  }, [dishes, search, statusFilter]);

  const activeCount = dishes.filter((dish) => dish.available).length;
  const inactiveCount = dishes.length - activeCount;
  const cartItems = Object.entries(cart)
    .map(([dishId, quantity]) => ({
      dish: dishes.find((dish) => dish.id === Number(dishId)),
      quantity,
    }))
    .filter((item) => item.dish && item.quantity > 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.dish.price * item.quantity, 0);
  const kitchenDate = new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const resetDishForm = () => setDishForm(emptyDishForm);

  const saveDish = async (event) => {
    event.preventDefault();
    setMessage("");
    try {

      const payload = {
        name: dishForm.name,
        price: Number(dishForm.price),
        categoryName: dishForm.categoryName,
        image: dishForm.image,
        available: dishForm.available,
      };

      if (dishForm.id) {
        await api.put(`/dishes/${dishForm.id}`, payload);
      setMessage("Страву оновлено");
      } else {
        await api.post("/dishes", payload);
      setMessage("Страву додано");
      }

      resetDishForm();
      loadDishes();
    } catch (error) {
      setMessage(error.response?.data?.message || "Dish was not saved. Check authorization and required fields.");
    }
  };

  const editDish = (dish) => {
    setDishForm({
      id: dish.id,
      name: dish.name,
      price: String(dish.price),
      categoryName: dish.category?.name || "",
      image: dish.image || "",
      available: dish.available,
    });
  };

  const deleteDish = async (id) => {
    if (!window.confirm("Видалити цю страву?")) return;
    await api.delete(`/dishes/${id}`);
    loadDishes();
  };

  const toggleDishStatus = async (dish) => {
    await api.put(`/dishes/${dish.id}`, { available: !dish.available });
    loadDishes();
  };

  const changeCartQuantity = (dishId, delta) => {
    setCart((current) => {
      const nextQuantity = Math.max((current[dishId] || 0) + delta, 0);
      const next = { ...current };

      if (nextQuantity === 0) delete next[dishId];
      else next[dishId] = nextQuantity;

      return next;
    });
  };

  const sendOrderToKitchen = async () => {
    setMessage("");

    if (!selectedTableId) {
      setMessage("Оберіть стіл для замовлення");
      return;
    }

    if (cartItems.length === 0) {
      setMessage("Додайте хоча б одну страву");
      return;
    }

    await api.post("/orders", {
      tableId: Number(selectedTableId),
      status: "cooking",
      items: cartItems.map((item) => ({
        dishId: item.dish.id,
        quantity: item.quantity,
      })),
    });

    setCart({});
    setSelectedTableId("");
    setMessage("Замовлення передано на кухню");
    loadOrders();
  };

  const updateKitchenOrderStatus = async (orderId, status) => {
    await api.patch(`/orders/${orderId}`, { status });
    loadOrders();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isChef ? "Кухня" : isWaiter ? "Меню для замовлення" : "Страви"}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {isAdmin
              ? "Керування меню: додавання, редагування, статус активності та видалення страв."
              : isWaiter
                ? "Додавайте активні страви до замовлення і передавайте їх на кухню."
                : "Переглядайте замовлення, передані на кухню, і позначайте готові."}
          </p>
        </div>

        {isChef && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm">
              <Clock3 className="h-5 w-5 text-gray-500" />
              {kitchenDate}
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-stone-600 text-lg font-bold text-white">
              К
            </div>
          </div>
        )}
      </div>

      {message && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700">
          {message}
        </div>
      )}

      {isAdmin && (
        <AdminMenuView
          dishes={dishes}
          filteredDishes={filteredDishes}
          activeCount={activeCount}
          inactiveCount={inactiveCount}
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          dishForm={dishForm}
          setDishForm={setDishForm}
          setMessage={setMessage}
          saveDish={saveDish}
          resetDishForm={resetDishForm}
          editDish={editDish}
          deleteDish={deleteDish}
          toggleDishStatus={toggleDishStatus}
        />
      )}

      {isWaiter && (
        <WaiterMenuView
          dishes={filteredDishes}
          search={search}
          setSearch={setSearch}
          tables={tables}
          selectedTableId={selectedTableId}
          setSelectedTableId={setSelectedTableId}
          cart={cart}
          cartItems={cartItems}
          cartTotal={cartTotal}
          changeCartQuantity={changeCartQuantity}
          sendOrderToKitchen={sendOrderToKitchen}
          orders={orders}
        />
      )}

      {isChef && <ChefKitchenView orders={orders} updateKitchenOrderStatus={updateKitchenOrderStatus} />}
    </div>
  );
}

function StatCard({ title, value, caption, dark = false }) {
  return (
    <section className={`rounded-xl p-6 shadow-sm ${dark ? "bg-slate-800 text-white" : "bg-white text-gray-900"}`}>
      <div className="flex items-center gap-4">
        <div className={`grid h-12 w-12 place-items-center rounded-full ${dark ? "bg-white/10" : "bg-gray-100"}`}>
          <Utensils className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold opacity-75">{title}</p>
          <strong className="mt-1 block text-3xl">{value}</strong>
          <p className="mt-1 text-xs opacity-70">{caption}</p>
        </div>
      </div>
    </section>
  );
}

function AdminMenuView({
  dishes,
  filteredDishes,
  activeCount,
  inactiveCount,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  dishForm,
  setDishForm,
  setMessage,
  saveDish,
  resetDishForm,
  editDish,
  deleteDish,
  toggleDishStatus,
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Усі страви" value={dishes.length} caption="у меню" dark />
        <StatCard title="Активні страви" value={activeCount} caption="доступні для замовлення" />
        <StatCard title="Неактивні страви" value={inactiveCount} caption="приховані з меню" dark />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap gap-3">
            <label className="flex min-w-64 flex-1 items-center gap-2 rounded-lg border border-gray-200 px-3">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Пошук страви..."
                className="m-0 w-full border-0 p-3 outline-none"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-gray-200 px-4 py-3"
            >
              <option value="all">Усі статуси</option>
              <option value="active">Активні</option>
              <option value="inactive">Неактивні</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b text-left text-sm text-gray-500">
                  <th className="py-3">Страва</th>
                  <th>Категорія</th>
                  <th>Ціна</th>
                  <th>Статус</th>
                  <th>Дії</th>
                </tr>
              </thead>
              <tbody>
                {filteredDishes.map((dish) => (
                  <tr key={dish.id} className="border-b last:border-0">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        {dish.image ? (
                          <img src={dish.image} alt={dish.name} className="h-12 w-12 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                            <Utensils className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-gray-900">{dish.name}</p>
                          <p className="text-xs text-gray-500">{dish.image ? "Фото додано" : "Без фото"}</p>
                        </div>
                      </div>
                    </td>
                    <td>{dish.category?.name}</td>
                    <td>{dish.price} грн</td>
                    <td>
                      <button
                        onClick={() => toggleDishStatus(dish)}
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          dish.available ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {dish.available ? "Активна" : "Неактивна"}
                      </button>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => editDish(dish)} className="rounded-lg bg-gray-100 p-2 text-gray-700">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteDish(dish.id)} className="rounded-lg bg-red-50 p-2 text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">{dishForm.id ? "Редагувати страву" : "Додати страву"}</h2>

          <form onSubmit={saveDish} className="mt-5 space-y-4">
            <FormInput label="Назва" value={dishForm.name} onChange={(value) => setDishForm({ ...dishForm, name: value })} />
            <FormInput
              label="Ціна"
              type="number"
              value={dishForm.price}
              onChange={(value) => setDishForm({ ...dishForm, price: value })}
            />
            <FormInput
              label="Категорія"
              value={dishForm.categoryName}
              onChange={(value) => setDishForm({ ...dishForm, categoryName: value })}
            />
            <ImageUploadField dishForm={dishForm} setDishForm={setDishForm} setMessage={setMessage} />

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-600">Статус</span>
              <select
                value={dishForm.available ? "active" : "inactive"}
                onChange={(event) => setDishForm({ ...dishForm, available: event.target.value === "active" })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              >
                <option value="active">Активна</option>
                <option value="inactive">Неактивна</option>
              </select>
            </label>

            <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-400 px-4 py-3 font-bold text-white hover:bg-orange-500">
              <Plus className="h-4 w-4" />
              {dishForm.id ? "Зберегти зміни" : "Додати страву"}
            </button>

            {dishForm.id && (
              <button type="button" onClick={resetDishForm} className="w-full rounded-lg bg-gray-100 px-4 py-3 font-bold">
                Скасувати редагування
              </button>
            )}
          </form>
        </section>
      </div>
    </>
  );
}

function WaiterMenuView({
  dishes,
  search,
  setSearch,
  tables,
  selectedTableId,
  setSelectedTableId,
  cart,
  cartItems,
  cartTotal,
  changeCartQuantity,
  sendOrderToKitchen,
  orders,
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap gap-3">
          <label className="flex min-w-64 flex-1 items-center gap-2 rounded-lg border border-gray-200 px-3">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Пошук активної страви..."
              className="m-0 w-full border-0 p-3 outline-none"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {dishes.map((dish) => (
            <article key={dish.id} className="rounded-xl border border-gray-100 p-4">
              {dish.image ? (
                <img src={dish.image} alt={dish.name} className="mb-3 h-32 w-full rounded-lg object-cover" />
              ) : (
                <div className="mb-3 flex h-32 w-full items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                  <Utensils className="h-8 w-8" />
                </div>
              )}
              <p className="text-xs font-semibold text-gray-500">{dish.category?.name}</p>
              <h2 className="mt-1 font-bold text-gray-900">{dish.name}</h2>
              <p className="mt-2 text-sm text-gray-500">{dish.price} грн</p>

              <div className="mt-4 flex items-center justify-between">
                <button onClick={() => changeCartQuantity(dish.id, -1)} className="rounded-lg bg-gray-100 px-3 py-2">
                  -
                </button>
                <span className="font-bold">{cart[dish.id] || 0}</span>
                <button onClick={() => changeCartQuantity(dish.id, 1)} className="rounded-lg bg-orange-400 px-3 py-2 text-white">
                  +
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="space-y-6">
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Поточне замовлення</h2>

          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-semibold text-gray-600">Стіл</span>
            <select
              value={selectedTableId}
              onChange={(event) => setSelectedTableId(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            >
              <option value="">Оберіть стіл</option>
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  Стіл {table.number}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-4 space-y-3">
            {cartItems.map((item) => (
              <div key={item.dish.id} className="flex justify-between gap-3 text-sm">
                <span>{item.dish.name} x{item.quantity}</span>
                <strong>{item.dish.price * item.quantity} грн</strong>
              </div>
            ))}
            {cartItems.length === 0 && <p className="text-sm text-gray-500">Додайте страви до замовлення.</p>}
          </div>

          <div className="mt-5 flex justify-between border-t pt-4 font-bold">
            <span>Разом</span>
            <span>{cartTotal} грн</span>
          </div>

          <button
            onClick={sendOrderToKitchen}
            className="mt-5 w-full rounded-lg bg-orange-400 px-4 py-3 font-bold text-white hover:bg-orange-500"
          >
            Передати на кухню
          </button>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Активні замовлення</h2>
          <div className="mt-4 space-y-3">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                <div className="flex justify-between">
                  <strong>#{order.id}</strong>
                  <span>{orderStatusLabels[order.status]}</span>
                </div>
                <p className="mt-1 text-gray-500">Стіл {order.table?.number || order.tableId}</p>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

function ChefKitchenView({ orders, updateKitchenOrderStatus }) {
  const [activeTab, setActiveTab] = useState("new");
  const newOrders = orders.filter((order) => order.status === "new");
  const cookingOrders = orders.filter((order) => order.status === "cooking");
  const readyOrders = orders.filter((order) => order.status === "ready");
  const visibleOrders = activeTab === "all" ? orders : orders.filter((order) => order.status === activeTab);
  const tabs = [
    { id: "new", label: "Нові", count: newOrders.length },
    { id: "cooking", label: "Готуються", count: cookingOrders.length },
    { id: "ready", label: "Готові", count: readyOrders.length },
    { id: "all", label: "Всі замовлення", count: orders.length },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KitchenStat icon={ChefHat} title="Нові замовлення" value={newOrders.length} helper="потребують уваги" warm />
        <KitchenStat icon={ShoppingBasket} title="Готуються" value={cookingOrders.length} helper="у процесі" yellow />
        <KitchenStat icon={CheckCircle2} title="Готові" value={readyOrders.length} helper="очікують видачі" green />
        <KitchenStat icon={CalendarDays} title="Усі замовлення" value={orders.length} helper="активні на кухні" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl bg-white shadow-sm">
            <div className="flex flex-wrap border-b border-gray-100">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-7 py-4 font-bold transition ${
                    activeTab === tab.id ? "border-b-2 border-orange-400 text-orange-500" : "text-gray-600 hover:text-orange-500"
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            <div className="grid gap-4 p-4 md:grid-cols-2 2xl:grid-cols-4">
              {visibleOrders.map((order) => (
                <KitchenOrderCard key={order.id} order={order} updateKitchenOrderStatus={updateKitchenOrderStatus} />
              ))}
            </div>

            {visibleOrders.length === 0 && (
              <p className="p-8 text-center text-sm text-gray-500">Немає замовлень у цьому статусі.</p>
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-950">Останні замовлення</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-sm text-gray-500">
                    <th className="py-3">№ замовлення</th>
                    <th>Столик</th>
                    <th>Час</th>
                    <th>Статус</th>
                    <th>Страви</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 6).map((order) => (
                    <tr key={order.id} className="border-b border-gray-100 text-sm last:border-0">
                      <td className="py-4 font-bold text-gray-950">#{order.id}</td>
                      <td className="font-semibold text-gray-600">{order.table?.number || order.tableId}</td>
                      <td className="font-semibold text-gray-600">{formatKitchenTime(order.createdAt)}</td>
                      <td>
                        <KitchenStatusBadge status={order.status} />
                      </td>
                      <td className="text-gray-500">{order.items?.map((item) => item.dish?.name).join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-gray-950">Готові до видачі ({readyOrders.length})</h2>
          <div className="mt-5 space-y-3">
            {readyOrders.map((order) => (
              <article key={order.id} className="flex items-center justify-between rounded-xl bg-green-50/60 p-4">
                <div>
                  <div className="flex items-center gap-8">
                    <strong className="text-gray-950">#{order.id}</strong>
                    <span className="text-sm font-semibold text-gray-500">{formatKitchenTime(order.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">Столик {order.table?.number || order.tableId}</p>
                  <p className="mt-1 text-sm font-bold text-green-700">{order.items?.length || 0} страви</p>
                </div>
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </article>
            ))}

            {readyOrders.length === 0 && <p className="text-sm text-gray-500">Поки немає готових замовлень.</p>}
          </div>
        </aside>
      </section>
    </div>
  );

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Передано на кухню</h2>

      <div className="mt-5 space-y-4">
        {orders.map((order) => (
          <article key={order.id} className="rounded-xl border border-gray-100 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold">Замовлення #{order.id}</h3>
                <p className="text-sm text-gray-500">Стіл {order.table?.number || order.tableId}</p>
              </div>
              <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-700">
                {orderStatusLabels[order.status]}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {order.items?.map((item) => (
                <div key={item.id} className="flex justify-between rounded-lg bg-gray-50 p-3 text-sm">
                  <span>{item.dish?.name}</span>
                  <strong>x{item.quantity}</strong>
                </div>
              ))}
            </div>

            {order.status === "cooking" && (
              <button
                onClick={() => markOrderReady(order.id)}
                className="mt-4 flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-700"
              >
                <Check className="h-4 w-4" />
                Позначити готовим
              </button>
            )}
          </article>
        ))}

        {orders.length === 0 && <p className="text-sm text-gray-500">Поки немає замовлень на кухню.</p>}
      </div>
    </section>
  );
}

function KitchenStat({ icon: Icon, title, value, helper, warm = false, yellow = false, green = false }) {
  const colorClass = warm
    ? "bg-orange-50 text-orange-500"
    : yellow
      ? "bg-amber-50 text-amber-500"
      : green
        ? "bg-green-50 text-green-600"
        : "bg-white text-gray-700";

  return (
    <article className={`rounded-2xl p-7 shadow-sm ${colorClass}`}>
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

function KitchenOrderCard({ order, updateKitchenOrderStatus }) {
  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-950">#{order.id}</h3>
          <p className="mt-1 text-sm text-gray-500">Столик {order.table?.number || order.tableId}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-500">{formatKitchenTime(order.createdAt)}</p>
          <KitchenStatusBadge status={order.status} />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {order.items?.map((item) => (
          <div key={item.id} className="text-sm font-semibold text-gray-700">
            {item.quantity} x {item.dish?.name}
          </div>
        ))}
      </div>

      {order.status === "new" && (
        <button
          type="button"
          onClick={() => updateKitchenOrderStatus(order.id, "cooking")}
          className="mt-6 w-full rounded-xl bg-orange-400 px-4 py-3 font-bold text-white transition hover:bg-orange-500"
        >
          Почати готувати
        </button>
      )}

      {order.status === "cooking" && (
        <button
          type="button"
          onClick={() => updateKitchenOrderStatus(order.id, "ready")}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-bold text-white transition hover:bg-green-700"
        >
          <Check className="h-4 w-4" />
          Позначити готовим
        </button>
      )}
    </article>
  );
}

function KitchenStatusBadge({ status }) {
  const labels = {
    new: "Новий",
    cooking: "Готується",
    ready: "Готовий",
  };
  const classes = {
    new: "bg-orange-50 text-orange-600",
    cooking: "bg-amber-50 text-amber-700",
    ready: "bg-green-50 text-green-700",
  };

  return (
    <span className={`mt-2 inline-block rounded-lg px-3 py-1 text-xs font-bold ${classes[status] || "bg-gray-100 text-gray-600"}`}>
      {labels[status] || status}
    </span>
  );
}

function formatKitchenTime(value) {
  return new Date(value).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
}

function ImageUploadField({ dishForm, setDishForm, setMessage }) {
  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Оберіть файл зображення");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Зображення має бути менше 5 МБ");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDishForm((current) => ({ ...current, image: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-gray-600">Зображення страви</span>
      <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/40 p-3">
        {dishForm.image && (
          <div className="mb-3 flex items-center gap-3">
            <img src={dishForm.image} alt="Прев'ю страви" className="h-20 w-20 rounded-lg object-cover" />
            <button
              type="button"
              onClick={() => setDishForm((current) => ({ ...current, image: "" }))}
              className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-sm"
            >
              Видалити фото
            </button>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="block w-full cursor-pointer rounded-lg border border-gray-200 bg-white text-sm text-gray-600 file:mr-4 file:border-0 file:bg-orange-400 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-orange-500"
        />
      </div>
    </label>
  );
}

function FormInput({ label, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-gray-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2"
      />
    </label>
  );
}
