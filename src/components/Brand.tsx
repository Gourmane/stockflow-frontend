export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`inline-flex items-center text-white ${compact ? 'gap-2.5' : 'gap-3'}`}>
      <img src={`${import.meta.env.BASE_URL}nb-mark.png`} alt="NB" width="252" height="128" className={`h-auto shrink-0 ${compact ? 'w-9' : 'w-12'}`} />
      <span aria-hidden="true" className={`w-px bg-white/25 ${compact ? 'h-5' : 'h-7'}`} />
      <span className={`font-bold tracking-tight ${compact ? 'text-base' : 'text-xl'}`}>StockFlow</span>
    </div>
  );
}
