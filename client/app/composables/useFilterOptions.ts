interface FilterOptions {
  materials: string[];
  colors: string[];
  sizes: string[];
  countries: string[];
  brands: string[];
}

export const useFilterOptions = () => {
  const config = useRuntimeConfig();
  const baseURL = import.meta.server ? config.apiInternal : config.public.apiBase;

  const { data, pending } = useFetch<FilterOptions>('/api/products/filter-options', {
    baseURL,
    key: 'filter-options',
  });

  const materials = computed(() => data.value?.materials ?? []);
  const colors = computed(() => data.value?.colors ?? []);
  const sizes = computed(() => data.value?.sizes ?? []);
  const countries = computed(() => data.value?.countries ?? []);
  const brands = computed(() => data.value?.brands ?? []);

  return { materials, colors, sizes, countries, brands, pending };
};
