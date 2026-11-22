import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent, ComponentProps, FormEvent } from 'react';
import { Link } from 'react-router';
import { getApiValidationError } from '../services/apiErrors';
import { getAuthErrorMessage } from '../services/authErrors';
import { productService } from '../services/productService';
import type { Category } from '../types/category';
import type { CreateProductPayload, Product } from '../types/product';
import ActionButton from './ActionButton';
import Feedback from './Feedback';
import FieldError from './FieldError';

interface ProductInput {
  name: 'name' | 'sku' | 'brand' | 'unit_price' | 'min_stock' | 'image_url';
  label: string;
  inputMode?: ComponentProps<'input'>['inputMode'];
  type?: 'url';
  required?: boolean;
}

const inputs: ProductInput[] = [
  { name: 'name', label: 'Nom du produit', required: true },
  { name: 'sku', label: 'SKU', required: true },
  { name: 'brand', label: 'Marque' },
  { name: 'unit_price', label: 'Prix unitaire', inputMode: 'decimal' },
  { name: 'min_stock', label: 'Stock minimum', inputMode: 'numeric', required: true },
  { name: 'image_url', label: 'URL de l’image', type: 'url' },
];

const saveErrorMessages = {
  401: 'Votre session a expiré. Reconnectez-vous pour enregistrer le produit.',
  403: 'Vous n’avez pas l’autorisation d’enregistrer ce produit.',
  404: 'Ce produit est introuvable.',
  419: 'La vérification de sécurité (CSRF) a échoué. Reconnectez-vous pour enregistrer le produit.',
  422: 'Le serveur a rejeté certaines valeurs. Vérifiez votre saisie.',
};

interface ProductFormProps {
  categories: Category[];
  product?: Product;
  cancelPath: string;
  onSaved: (id: number) => void;
}

export default function ProductForm({ categories, product, cancelPath, onSaved }: ProductFormProps) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const savingRef = useRef(false);
  const mountedRef = useRef(false);
  const focusErrorRef = useRef(false);

  const defaults = {
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    brand: product?.brand ?? '',
    unit_price: product?.unit_price ?? '',
    min_stock: product?.min_stock ?? 0,
    image_url: product?.image_url ?? '',
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useLayoutEffect(() => {
    if (focusErrorRef.current && !isSaving) {
      focusErrorRef.current = false;
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [fieldErrors, isSaving]);

  function showFieldErrors(errors: Record<string, string[]>) {
    focusErrorRef.current = true;
    setFieldErrors(errors);
  }

  function clearFieldError(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const name = event.currentTarget.name;
    if (!fieldErrors[name]) return;
    setFieldErrors((previous) => ({ ...previous, [name]: [] }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;

    setSaveError('');
    setFieldErrors({});
    const form = event.currentTarget;
    const fields = new FormData(form);
    const value = (name: string) => String(fields.get(name) ?? '').trim();
    const name = value('name');
    const sku = value('sku');
    const categoryId = Number(value('category_id'));
    const brand = value('brand');
    const unitPrice = value('unit_price').replace(',', '.');
    const minStock = value('min_stock');
    const imageUrl = value('image_url');
    const errors: Record<string, string[]> = {};

    if (!name) errors.name = ['Saisissez un nom.'];
    else if (Array.from(name).length > 255) errors.name = ['Le nom est limité à 255 caractères.'];
    if (!sku) errors.sku = ['Saisissez un SKU.'];
    else if (Array.from(sku).length > 100) errors.sku = ['Le SKU est limité à 100 caractères.'];
    if (!categories.some(({ id }) => id === categoryId)) errors.category_id = ['Sélectionnez une catégorie.'];
    if (Array.from(brand).length > 100) errors.brand = ['La marque est limitée à 100 caractères.'];
    if (unitPrice && (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(unitPrice) || Number(unitPrice) > 9_999_999_999.99)) {
      errors.unit_price = ['Saisissez un prix de 0 à 9 999 999 999,99 avec deux décimales au maximum.'];
    }
    if (!/^\d+$/.test(minStock) || Number(minStock) > 4_294_967_295) {
      errors.min_stock = ['Saisissez un entier de 0 à 4 294 967 295.'];
    }
    const imageInput = form.elements.namedItem('image_url');
    if (imageUrl && imageInput instanceof HTMLInputElement && imageInput.validity.typeMismatch) {
      errors.image_url = ['Saisissez une URL absolue.'];
    }

    if (Object.keys(errors).length) {
      showFieldErrors(errors);
      return;
    }

    const payload: CreateProductPayload = {
      category_id: categoryId,
      sku,
      name,
      brand: brand || null,
      unit_price: unitPrice || null,
      min_stock: Number(minStock),
      image_url: imageUrl || null,
    };

    savingRef.current = true;
    setIsSaving(true);

    try {
      const { data } = product
        ? await productService.update(product.id, payload)
        : await productService.create(payload);
      if (!Number.isSafeInteger(data?.id) || data.id <= 0) throw new Error('Réponse produit inattendue.');
      if (mountedRef.current) onSaved(data.id);
    } catch (error) {
      if (!mountedRef.current) return;
      const validation = getApiValidationError(error);
      if (validation) {
        showFieldErrors(validation.errors);
        const visibleFields = ['category_id', ...inputs.map(({ name }) => name)];
        if (Object.entries(validation.errors).some(([field, messages]) => !visibleFields.includes(field) && messages.length) ||
          !Object.values(validation.errors).some((messages) => messages.length)) {
          setSaveError(validation.message);
        }
      } else {
        setSaveError(getAuthErrorMessage(error, saveErrorMessages, 'Impossible d’enregistrer le produit. Réessayez.'));
      }
    } finally {
      savingRef.current = false;
      if (mountedRef.current) setIsSaving(false);
    }
  }

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="panel space-y-5 p-4 sm:p-6">
      {saveError && <Feedback status="error" message={saveError} />}
      <fieldset disabled={isSaving} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <div className="min-w-0 sm:col-span-2">
          <label htmlFor="product-category_id" className="mb-1 block text-sm font-medium">Catégorie</label>
          <select
            id="product-category_id"
            name="category_id"
            required
            defaultValue={product?.category_id ?? ''}
            onChange={clearFieldError}
            aria-invalid={!!fieldErrors.category_id?.length || undefined}
            aria-describedby={fieldErrors.category_id?.length ? 'product-category_id-error' : undefined}
            className="field-control"
          >
            <option value="" disabled>Choisir une catégorie</option>
            {categories.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
          </select>
          <div aria-live="polite"><FieldError id="product-category_id-error" messages={fieldErrors.category_id} /></div>
        </div>

        {inputs.map(({ name, label, required, type, inputMode }) => {
          const errorId = `product-${name}-error`;
          const messages = fieldErrors[name];
          return (
            <div key={name} className="min-w-0">
              <label htmlFor={`product-${name}`} className="mb-1 block text-sm font-medium">{label}</label>
              <input
                id={`product-${name}`}
                name={name}
                type={type ?? 'text'}
                required={required}
                inputMode={inputMode}
                defaultValue={defaults[name]}
                onChange={clearFieldError}
                aria-invalid={!!messages?.length || undefined}
                aria-describedby={messages?.length ? errorId : undefined}
                className="field-control"
              />
              <div aria-live="polite"><FieldError id={errorId} messages={messages} /></div>
            </div>
          );
        })}
      </fieldset>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Link
          to={cancelPath}
          className="button button-secondary"
        >
          Annuler
        </Link>
        <ActionButton type="submit" isPending={isSaving} pendingLabel="Enregistrement…">
          {product ? 'Enregistrer les modifications' : 'Créer le produit'}
        </ActionButton>
      </div>
    </form>
  );
}
