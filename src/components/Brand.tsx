export default function Brand() {
  return (
    <div className="inline-flex items-center gap-3 text-white">
      <img src={`${import.meta.env.BASE_URL}nb-mark.png`} alt="NB" width="252" height="128" className="h-auto w-12 shrink-0" />
      <span aria-hidden="true" className="h-7 w-px bg-white/25" />
      <span className="text-xl font-bold tracking-tight">StockFlow</span>
    </div>
  );
}
