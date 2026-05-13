import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Edit2,
  Package,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { api } from "../api/api";

const emptyForm = {
  id: null,
  name: "",
  category: "",
  unit: "кг",
  quantity: "",
  minAmount: "1",
  image: "",
};

const defaultImages = {
  Овочі: "🥬",
  "М'ясо": "🥩",
  "Риба та морепродукти": "🐟",
  "Молочні продукти": "🧀",
  Бакалія: "🥣",
  "Спеції та приправи": "🌿",
};

const statusLabels = {
  available: "В наявності",
  low: "Мало",
  out: "Немає",
};

const statusClasses = {
  available: "bg-green-50 text-green-700",
  low: "bg-orange-50 text-orange-600",
  out: "bg-red-50 text-red-600",
};

const formatQuantity = (ingredient) => `${ingredient.quantity} ${ingredient.unit}`;

export default function IngredientsPage() {
  const role = localStorage.getItem("role") || "CHEF";
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState({ total: 0, available: 0, low: 0, out: 0 });
  const [lowStock, setLowStock] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 8, total: 0, pageCount: 1 });
  const [filters, setFilters] = useState({ search: "", category: "all" });
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("uk-UA", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
    [],
  );

  const loadIngredients = async (page = pagination.page) => {
    setLoading(true);
    const response = await api.get("/ingredients", {
      params: {
        page,
        pageSize: pagination.pageSize,
        search: filters.search || undefined,
        category: filters.category,
      },
    });

    setIngredients(response.data.ingredients);
    setCategories(response.data.categories);
    setSummary(response.data.summary);
    setLowStock(response.data.lowStock);
    setPagination(response.data.pagination);
    setLoading(false);
  };

  useEffect(() => {
    loadIngredients(1);
  }, [filters.search, filters.category, pagination.pageSize]);

  const saveIngredient = async (event) => {
    event.preventDefault();

    const payload = {
      name: form.name,
      category: form.category,
      unit: form.unit,
      quantity: Number(form.quantity),
      minAmount: Number(form.minAmount),
      image: form.image,
    };

    if (form.id) {
      await api.put(`/ingredients/${form.id}`, payload);
      setMessage("Інгредієнт оновлено");
    } else {
      await api.post("/ingredients", payload);
      setMessage("Інгредієнт додано");
    }

    setForm(emptyForm);
    setShowForm(false);
    loadIngredients(1);
  };

  const editIngredient = (ingredient) => {
    setForm({
      id: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      unit: ingredient.unit,
      quantity: String(ingredient.quantity),
      minAmount: String(ingredient.minAmount),
      image: ingredient.image || "",
    });
    setShowForm(true);
  };

  const deleteIngredient = async (ingredient) => {
    if (!window.confirm(`Видалити "${ingredient.name}"?`)) return;
    await api.delete(`/ingredients/${ingredient.id}`);
    setMessage("Інгредієнт видалено");
    loadIngredients(1);
  };

  if (role !== "CHEF" && role !== "ADMIN") {
    return (
      <section className="rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-950">Немає доступу</h1>
        <p className="mt-2 text-gray-500">Ця сторінка доступна кухарю.</p>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-950">Інгредієнти</h1>
          <p className="mt-2 text-gray-500">Керуйте запасами інгредієнтів та контролюйте їх наявність.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm">
            <CalendarDays className="h-5 w-5 text-gray-500" />
            {today}
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-stone-600 text-lg font-bold text-white">K</div>
        </div>
      </header>

      {message && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700">
          {message}
        </div>
      )}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <IngredientStat icon={Package} title="Всього інгредієнтів" value={summary.total} helper="найменувань" green />
        <IngredientStat icon={CheckCircle2} title="В наявності" value={summary.available} helper="найменувань" orange />
        <IngredientStat icon={AlertTriangle} title="Мало залишилось" value={summary.low} helper="найменувань" red />
        <IngredientStat icon={XCircle} title="Немає в наявності" value={summary.out} helper="найменувань" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_190px_220px]">
            <label className="flex items-center gap-3 rounded-xl border border-gray-100 px-4">
              <Search className="h-5 w-5 text-gray-400" />
              <input
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Пошук інгредієнтів..."
                className="w-full border-0 py-3 outline-none"
              />
            </label>

            <select
              value={filters.category}
              onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
              className="rounded-xl border border-gray-100 px-4 py-3 font-semibold text-gray-700"
            >
              <option value="all">Усі категорії</option>
              {categories.map((category) => (
                <option key={category.name} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setForm(emptyForm);
                setShowForm(true);
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-orange-400 px-4 py-3 font-bold text-white transition hover:bg-orange-500"
            >
              <Plus className="h-5 w-5" />
              Додати інгредієнт
            </button>
          </div>

          {showForm && (
            <IngredientForm
              form={form}
              setForm={setForm}
              onSubmit={saveIngredient}
              onCancel={() => {
                setShowForm(false);
                setForm(emptyForm);
              }}
            />
          )}

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sm text-gray-500">
                  <th className="py-4">Інгредієнт</th>
                  <th>Категорія</th>
                  <th>Одиниця</th>
                  <th>Кількість</th>
                  <th>Статус</th>
                  <th className="text-right">Дія</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ingredient) => (
                  <tr key={ingredient.id} className="border-b border-gray-100 text-sm last:border-0">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <IngredientAvatar ingredient={ingredient} />
                        <strong className="text-gray-950">{ingredient.name}</strong>
                      </div>
                    </td>
                    <td className="font-semibold text-gray-600">{ingredient.category}</td>
                    <td className="font-semibold text-gray-600">{ingredient.unit}</td>
                    <td className="font-semibold text-gray-950">{ingredient.quantity}</td>
                    <td>
                      <span className={`rounded-lg px-3 py-2 text-xs font-bold ${statusClasses[ingredient.status]}`}>
                        {statusLabels[ingredient.status]}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => editIngredient(ingredient)}
                          className="grid h-10 w-10 place-items-center rounded-lg bg-gray-50 text-gray-700 transition hover:bg-gray-100"
                          title="Редагувати"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteIngredient(ingredient)}
                          className="grid h-10 w-10 place-items-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100"
                          title="Видалити"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && ingredients.length === 0 && (
              <p className="py-10 text-center text-sm text-gray-500">Інгредієнтів поки немає.</p>
            )}
            {loading && <p className="py-10 text-center text-sm text-gray-500">Завантаження інгредієнтів...</p>}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-gray-500">
            <span>
              Показано {ingredients.length ? (pagination.page - 1) * pagination.pageSize + 1 : 0}-
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} з {pagination.total} інгредієнтів
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadIngredients(pagination.page - 1)}
                className="rounded-xl border border-gray-100 px-4 py-2 font-bold disabled:opacity-40"
              >
                Назад
              </button>
              <span className="rounded-xl bg-orange-400 px-4 py-2 font-bold text-white">{pagination.page}</span>
              <button
                disabled={pagination.page >= pagination.pageCount}
                onClick={() => loadIngredients(pagination.page + 1)}
                className="rounded-xl border border-gray-100 px-4 py-2 font-bold disabled:opacity-40"
              >
                Далі
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-950">Категорії</h2>
            <div className="mt-5 space-y-3">
              <CategoryRow name="Усі інгредієнти" count={summary.total} active />
              {categories.map((category) => (
                <CategoryRow key={category.name} name={category.name} count={category.count} />
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-950">Мало залишилось</h2>
              <button
                type="button"
                onClick={() => setFilters((current) => ({ ...current, category: "all" }))}
                className="text-sm font-bold text-orange-500"
              >
                Переглянути всі
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {lowStock.map((ingredient) => (
                <div key={ingredient.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <IngredientAvatar ingredient={ingredient} small />
                    <span className="font-semibold text-gray-700">{ingredient.name}</span>
                  </div>
                  <strong className="text-gray-950">{formatQuantity(ingredient)}</strong>
                </div>
              ))}
              {lowStock.length === 0 && <p className="text-sm text-gray-500">Усі запаси в нормі.</p>}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function IngredientStat({ icon: Icon, title, value, helper, green = false, orange = false, red = false }) {
  const className = green
    ? "bg-green-50 text-green-700"
    : orange
      ? "bg-orange-50 text-orange-500"
      : red
        ? "bg-red-50 text-red-500"
        : "bg-gray-50 text-gray-700";

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

function IngredientForm({ form, setForm, onSubmit, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="mt-5 grid gap-4 rounded-2xl border border-orange-100 bg-orange-50/30 p-4 md:grid-cols-3">
      <FormInput label="Назва" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
      <FormInput label="Категорія" value={form.category} onChange={(value) => setForm({ ...form, category: value })} />
      <FormInput label="Одиниця" value={form.unit} onChange={(value) => setForm({ ...form, unit: value })} />
      <FormInput label="Кількість" type="number" value={form.quantity} onChange={(value) => setForm({ ...form, quantity: value })} />
      <FormInput label="Мінімум" type="number" value={form.minAmount} onChange={(value) => setForm({ ...form, minAmount: value })} />
      <FormInput label="Emoji / фото" value={form.image} onChange={(value) => setForm({ ...form, image: value })} />
      <div className="flex gap-3 md:col-span-3">
        <button className="rounded-xl bg-orange-400 px-5 py-3 font-bold text-white transition hover:bg-orange-500">
          {form.id ? "Зберегти зміни" : "Додати інгредієнт"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl bg-white px-5 py-3 font-bold text-gray-700">
          Скасувати
        </button>
      </div>
    </form>
  );
}

function FormInput({ label, value, onChange, type = "text" }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-gray-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-100 bg-white px-4 py-3 outline-none focus:border-orange-300"
        required={label !== "Emoji / фото"}
      />
    </label>
  );
}

function IngredientAvatar({ ingredient, small = false }) {
  const size = small ? "h-9 w-9 text-xl" : "h-12 w-12 text-2xl";
  const image = ingredient.image || defaultImages[ingredient.category] || "📦";

  if (image.startsWith("data:") || image.startsWith("http")) {
    return <img src={image} alt={ingredient.name} className={`${size} rounded-xl object-cover`} />;
  }

  return <div className={`grid ${size} place-items-center rounded-xl bg-gray-50`}>{image}</div>;
}

function CategoryRow({ name, count, active = false }) {
  return (
    <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${active ? "bg-orange-50" : ""}`}>
      <span className="font-semibold text-gray-700">{name}</span>
      <span className={`rounded-lg px-2 py-1 text-sm font-bold ${active ? "bg-orange-100 text-orange-500" : "bg-gray-100 text-gray-500"}`}>
        {count}
      </span>
    </div>
  );
}
