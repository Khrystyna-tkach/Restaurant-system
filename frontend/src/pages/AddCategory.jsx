import { useEffect, useState } from "react";
import { FolderPlus, Trash2, Utensils } from "lucide-react";
import { api } from "../api/api";

export default function AddCategory() {
  const role = localStorage.getItem("role") || "ADMIN";
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const loadCategories = async () => {
    const response = await api.get("/categories");
    setCategories(response.data);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const addCategory = async (event) => {
    event.preventDefault();
    if (role !== "ADMIN" || !name.trim()) return;

    await api.post("/categories", { name });
    setName("");
    setMessage("Категорію додано");
    loadCategories();
  };

  const deleteCategory = async (category) => {
    if (role !== "ADMIN") return;
    if (category.dishes?.length) {
      setMessage("Не можна видалити категорію, у якій вже є страви");
      return;
    }

    if (!window.confirm(`Видалити категорію "${category.name}"?`)) return;

    await api.delete(`/categories/${category.id}`);
    setMessage("Категорію видалено");
    loadCategories();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-950">Категорії</h1>
          <p className="mt-2 text-gray-500">Створення та керування категоріями меню ресторану.</p>
        </div>
      </header>

      {message && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700">
          {message}
        </div>
      )}

      {role === "ADMIN" && (
        <form onSubmit={addCategory} className="flex flex-wrap gap-3 rounded-2xl bg-white p-5 shadow-sm">
          <label className="min-w-72 flex-1">
            <span className="mb-2 block text-sm font-bold text-gray-600">Назва категорії</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Наприклад: Основні страви"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-orange-300"
            />
          </label>
          <button className="self-end rounded-xl bg-orange-400 px-5 py-3 font-bold text-white transition hover:bg-orange-500">
            <span className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5" />
              Додати категорію
            </span>
          </button>
        </form>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <article key={category.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-stone-100 text-stone-700">
                  <Utensils className="h-6 w-6" strokeWidth={1.7} />
                </div>
                <div>
                  <h2 className="font-bold text-gray-950">{category.name}</h2>
                  <p className="text-sm text-gray-500">{category.dishes?.length || 0} страв</p>
                </div>
              </div>

              {role === "ADMIN" && (
                <button
                  type="button"
                  onClick={() => deleteCategory(category)}
                  className="rounded-lg bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                  title="Видалити категорію"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </article>
          ))}
        </div>

        {categories.length === 0 && <p className="text-sm text-gray-500">Категорій поки немає.</p>}
      </section>
    </div>
  );
}
