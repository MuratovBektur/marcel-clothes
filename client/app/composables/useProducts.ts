import { computed, ref, type Ref } from 'vue';

export interface Product {
  id: string;
  gender: string;
  category: string;
  type: string;
  brand: string | null;
  country: string;
  price: string;
  materials: string[];
  colors: string[];
  sizes: string[];
  description: string | null;
  photos: string[];
  extraPhotos: string[];
  isPublished: boolean;
  createdAt: string;
}

interface ApiMeta {
  total: number;
  page: number;
  lastPage: number;
  limit: number;
}

interface ApiResponse {
  data: Product[];
  meta: ApiMeta;
}

export const useProducts = (
  opts: {
    gender?: Ref<string>;
    category?: Ref<string>;
    type?: Ref<string>;
    brand?: Ref<string>;
    search?: Ref<string>;
    country?: Ref<string>;
    materials?: Ref<string[]>;
    colors?: Ref<string[]>;
    sizes?: Ref<string[]>;
    priceMin?: Ref<number | null>;
    priceMax?: Ref<number | null>;
  } = {},
) => {
  const config = useRuntimeConfig();
  const page = ref(1);

  const params = computed(() => {
    const p = new URLSearchParams();
    p.set('page', String(page.value));
    p.set('limit', '20');
    if (opts.gender?.value) p.set('gender', opts.gender.value);
    if (opts.category?.value) p.set('category', opts.category.value);
    if (opts.type?.value) p.set('type', opts.type.value);
    if (opts.brand?.value) p.set('brand', opts.brand.value);
    if (opts.search?.value) p.set('search', opts.search.value);
    if (opts.country?.value) p.set('country', opts.country.value);
    if (opts.materials?.value?.length) p.set('materials', opts.materials.value.join(','));
    if (opts.colors?.value?.length) p.set('colors', opts.colors.value.join(','));
    if (opts.sizes?.value?.length) p.set('sizes', opts.sizes.value.join(','));
    if (opts.priceMin?.value != null) p.set('priceMin', String(opts.priceMin.value));
    if (opts.priceMax?.value != null) p.set('priceMax', String(opts.priceMax.value));
    return p.toString();
  });

  const url = computed(() => `/api/products?${params.value}`);

  const baseURL = import.meta.server
    ? config.apiInternal
    : config.public.apiBase;

  const { data, pending, error, refresh } = useFetch<ApiResponse>(url, {
    baseURL,
    key: computed(() => `products-${params.value}`),
    watch: [url],
  });

  const products = computed(() => data.value?.data ?? []);
  const meta = computed(
    () => data.value?.meta ?? { total: 0, page: 1, lastPage: 1, limit: 20 },
  );

  function setPage(n: number) {
    page.value = n;
    if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetPage() {
    page.value = 1;
  }

  return { products, meta, pending, error, page, setPage, resetPage, refresh };
};
