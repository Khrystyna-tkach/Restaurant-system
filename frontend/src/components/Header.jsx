export default function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div>
        <p className="text-sm text-slate-500">Restaurant System</p>
        <h1 className="text-lg font-semibold text-slate-900">Система обліку замовлень</h1>
      </div>

      <div className="rounded-full bg-orange-100 px-4 py-2 text-sm font-medium text-orange-700">
        Адміністратор
      </div>
    </header>
  );
}
