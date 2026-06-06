interface FilterOptions {
  materials: string[];
  colors: string[];
  sizes: string[];
  types: string[];
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
  const types = computed(() => data.value?.types ?? []);

  return { materials, colors, sizes, types, pending };
};
