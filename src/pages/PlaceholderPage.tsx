export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">Cette section sera disponible prochainement.</p>
    </>
  );
}
