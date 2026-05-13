import { useEffect, useState } from "react";
import { api } from "../api/api";

const canManageTables = (role) => role === "ADMIN";
const canToggleStatus = (role) => role === "ADMIN" || role === "WAITER";

export default function TablesPage() {
  const role = localStorage.getItem("role") || "ADMIN";
  const [tables, setTables] = useState([]);

  const fetchTables = async () => {
    const response = await api.get("/tables");
    setTables(response.data);
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const toggleStatus = async (id, currentStatus) => {
    if (!canToggleStatus(role)) return;

    await api.patch(`/tables/${id}/status`, { isOccupied: !currentStatus });

    fetchTables();
  };

  const addTable = async () => {
    if (!canManageTables(role)) return;

    const number = prompt("Введіть номер столу:");
    const capacity = prompt("Введіть кількість місць:");

    if (number && capacity) {
      await api.post("/tables", { number, capacity });
      fetchTables();
    }
  };

  const deleteTable = async (id) => {
    if (!canManageTables(role)) return;

    if (window.confirm("Ви впевнені, що хочете видалити цей стіл?")) {
      await api.delete(`/tables/${id}`);
      fetchTables();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Столи</h1>
          <p className="mt-1 text-sm text-gray-500">
            {role === "ADMIN"
              ? "Адміністратор може додавати, видаляти та змінювати статус столів."
              : role === "WAITER"
                ? "Офіціант може змінювати тільки статус зайнятості столу."
                : "Кухар не має доступу до керування столами."}
          </p>
        </div>

        {canManageTables(role) && (
          <button
            onClick={addTable}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700"
          >
            + Додати стіл
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {tables.map((table) => (
          <div
            key={table.id}
            className="relative flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
          >
            {canManageTables(role) && (
              <button
                onClick={() => deleteTable(table.id)}
                className="absolute right-3 top-3 text-gray-300 transition hover:text-red-500"
                title="Видалити стіл"
              >
                x
              </button>
            )}

            <h3 className="text-lg font-semibold">Стіл {table.number}</h3>
            <p className="mb-4 text-sm text-gray-500">{table.capacity} місця</p>

            <button
              disabled={!canToggleStatus(role)}
              onClick={() => toggleStatus(table.id, table.isOccupied)}
              className={`rounded-full px-6 py-1 text-sm font-medium transition ${
                table.isOccupied ? "bg-red-50 text-red-500" : "bg-green-50 text-green-500"
              } ${canToggleStatus(role) ? "hover:brightness-95" : "cursor-not-allowed opacity-60"}`}
            >
              {table.isOccupied ? "Зайнятий" : "Вільний"}
            </button>
          </div>
        ))}

        {canManageTables(role) && (
          <button
            onClick={addTable}
            className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 p-6 text-indigo-600 transition hover:bg-indigo-50"
          >
            <span className="mb-2 text-3xl">+</span>
            <span className="font-medium">Додати стіл</span>
          </button>
        )}
      </div>
    </div>
  );
}
