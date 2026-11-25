import { ImageOff } from 'lucide-react';
import { useState } from 'react';

interface ProductImageProps {
  url: string | null;
  description?: string;
  featured?: boolean;
}

export default function ProductImage({ url, description = '', featured = false }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`grid min-w-0 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-canvas text-muted ${
      featured ? 'aspect-[4/3] w-full' : 'size-10 bg-white'
    }`}>
      {url && !failed ? (
        <img
          src={url}
          alt={description}
          loading={featured ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain p-1"
        />
      ) : (
        <span className="grid justify-items-center gap-2 text-xs">
          <ImageOff aria-hidden="true" className={featured ? 'size-7' : 'size-[18px]'} />
          {featured && 'Image indisponible'}
        </span>
      )}
    </div>
  );
}
