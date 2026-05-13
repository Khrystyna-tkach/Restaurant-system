import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/api";
import {
  BarChart3,
  ChefHat,
  Eye,
  Lock,
  Mail,
  ShieldCheck,
  User,
  Users,
  Utensils,
} from "lucide-react";

const benefits = [
  {
    icon: Users,
    title: "Зручне управління",
    text: "Усі інструменти для ефективної роботи вашого ресторану",
  },
  {
    icon: BarChart3,
    title: "Контроль і аналітика",
    text: "Слідкуйте за замовленнями, столиками та персоналом",
  },
  {
    icon: ShieldCheck,
    title: "Безпека даних",
    text: "Ми дбаємо про безпеку ваших даних",
  },
];

const roles = [
  {
    id: "WAITER",
    title: "Офіціант",
    desc: "Прийом замовлень, управління столиками та обслуговування гостей",
    icon: Utensils,
    tone: "bg-stone-600 text-white",
  },
  {
    id: "ADMIN",
    title: "Адміністратор",
    desc: "Управління рестораном, персоналом, меню та налаштуваннями",
    icon: ShieldCheck,
    tone: "bg-stone-100 text-stone-700",
  },
  {
    id: "CHEF",
    title: "Кухар",
    desc: "Перегляд замовлень і контроль приготування страв",
    icon: ChefHat,
    tone: "bg-slate-700 text-white",
  },
];

function InputField({ icon: Icon, label, placeholder, type = "text", value, onChange, showEye = false }) {
  const [visible, setVisible] = useState(false);
  const inputType = showEye && visible ? "text" : type;

  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-stone-500">{label}</span>
      <span className="flex h-12 items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 shadow-sm shadow-stone-200/70 transition focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-100">
        <Icon className="h-4.5 w-4.5 text-stone-400" strokeWidth={2} />
        <input
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="m-0 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-medium text-stone-800 outline-none placeholder:text-stone-400"
        />
        {showEye && (
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            className="m-0 grid h-8 w-8 place-items-center rounded-lg p-0 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
            aria-label={visible ? "Сховати пароль" : "Показати пароль"}
          >
            <Eye className="h-4.5 w-4.5" strokeWidth={2} />
          </button>
        )}
      </span>
    </label>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "WAITER",
  });

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Паролі не співпадають");
      return;
    }

    try {
      const { data } = await api.post("/auth/register", formData);

      localStorage.setItem("role", data.user.role);
      localStorage.setItem("userName", `${data.user.firstName} ${data.user.lastName}`);
      localStorage.setItem("token", data.token);
      navigate("/");
    } catch (error) {
      setError(error.response?.data?.message || "Сервер недоступний. Перевірте, чи запущений backend");
    }
  };

  return (
    <main className="min-h-screen bg-stone-700 p-2 text-stone-900 sm:p-5">
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-black/30 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="relative hidden overflow-hidden bg-stone-900 px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.16),transparent_24%),linear-gradient(145deg,rgba(60,52,47,0.92),rgba(23,23,23,0.96)),url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-black/35" />

          <div className="relative">
            <div className="mb-7 flex justify-center text-orange-300">
              <Utensils className="h-11 w-11" strokeWidth={1.8} />
            </div>

            <h1 className="text-center text-2xl font-bold tracking-tight">Restaurant System</h1>
            <p className="mx-auto mt-4 max-w-44 text-center text-base leading-relaxed text-stone-200">
              Система управління рестораном
            </p>
            <div className="mx-auto mt-8 h-px w-40 bg-orange-300" />

            <div className="mt-14 space-y-8">
              {benefits.map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/20">
                    <Icon className="h-6 w-6 text-white" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold">{title}</h2>
                    <p className="mt-1.5 text-xs leading-relaxed text-stone-200">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="relative m-0 text-left text-xs font-semibold text-stone-200 transition hover:text-white"
          >
            Вже маєте акаунт? <span className="text-orange-300 underline">Увійти</span>
          </button>
        </aside>

        <section className="overflow-y-auto bg-stone-50 px-6 py-8 sm:px-8 lg:px-12">
          <form onSubmit={handleSubmit} className="mx-auto max-w-xl">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-stone-800">Створити акаунт</h2>
              <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-relaxed text-stone-500">
                Зареєструйтесь, щоб почати роботу в системі
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <InputField
                icon={User}
                label="Ім'я"
                placeholder="Введіть ім'я"
                value={formData.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
              />
              <InputField
                icon={User}
                label="Прізвище"
                placeholder="Введіть прізвище"
                value={formData.lastName}
                onChange={(event) => updateField("lastName", event.target.value)}
              />
            </div>

            <div className="mt-4 space-y-4">
              <InputField
                icon={Mail}
                label="Email"
                type="email"
                placeholder="Введіть ваш email"
                value={formData.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
              <InputField
                icon={Lock}
                label="Пароль"
                type="password"
                placeholder="Створіть пароль"
                value={formData.password}
                onChange={(event) => updateField("password", event.target.value)}
                showEye
              />
              <InputField
                icon={Lock}
                label="Підтвердіть пароль"
                type="password"
                placeholder="Підтвердіть пароль"
                value={formData.confirmPassword}
                onChange={(event) => updateField("confirmPassword", event.target.value)}
                showEye
              />
            </div>

            <div className="mt-6">
              <p className="mb-3 text-xs font-semibold text-stone-500">Роль у системі</p>

              <div className="space-y-3">
                {roles.map((role) => {
                  const selected = formData.role === role.id;
                  const Icon = role.icon;

                  return (
                    <label
                      key={role.id}
                      className={`flex cursor-pointer items-center gap-4 rounded-xl border bg-white p-3 shadow-sm shadow-stone-200/70 transition ${
                        selected ? "border-orange-300 ring-4 ring-orange-100" : "border-stone-100 hover:border-stone-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role.id}
                        checked={selected}
                        onChange={() => updateField("role", role.id)}
                        className="sr-only"
                      />
                      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${role.tone}`}>
                        <Icon className="h-6 w-6" strokeWidth={1.7} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-bold text-stone-800">{role.title}</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-stone-500">{role.desc}</span>
                      </span>
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                          selected ? "border-orange-300" : "border-stone-300"
                        }`}
                      >
                        {selected && <span className="h-2.5 w-2.5 rounded-full bg-orange-300" />}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="m-0 mt-6 h-12 w-full rounded-xl bg-orange-300 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-200"
            >
              Зареєструватися
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
