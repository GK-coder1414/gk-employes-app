export function Spinner({ label = "Chargement..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-zinc-500">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
