export const useSearch = () => {
  const router = useRouter();
  const route = useRoute();

  const query = computed({
    get: () =>
      typeof route.query.search === 'string' ? route.query.search : '',
    set: (val: string) => {
      router.push({
        path: '/',
        query: val.trim() ? { search: val.trim() } : {},
      });
    },
  });

  return { query };
};
