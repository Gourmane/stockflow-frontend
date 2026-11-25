import { UserRound } from 'lucide-react';

export default function UserAvatar({ name, inverse = false }: { name: string; inverse?: boolean }) {
  const initials = name.trim().split(/\s+/).slice(0, 2)
    .map((part) => Array.from(part)[0]).join('').toLocaleUpperCase('fr');

  return (
    <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-md text-xs font-bold ${
      inverse ? 'bg-white/12 text-white lg:bg-brand-tint lg:text-brand' : 'bg-brand-tint text-brand'
    }`}>
      {initials || <UserRound className="size-4" />}
    </span>
  );
}
