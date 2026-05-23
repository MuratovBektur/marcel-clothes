import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// const TWO_HOURS = 2 * 60 * 60 * 1000;
const ONE_HOURS = 1 * 60 * 60 * 1000;

function beforeUpdateSitemaps() {
  console.log(' ');
  console.log(' ');
  console.log('calling updateAllSitemaps');
}

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig();
  process.env.API_URL = `${config.apiInternal}/api`;

  const require = createRequire(import.meta.url);
  const { updateAllSitemaps } = require(
    resolve(process.cwd(), 'scripts/update-all-sitemaps.cjs'),
  );

  setTimeout(() => {
    beforeUpdateSitemaps();
    updateAllSitemaps().catch(console.error);
  }, 30_000);

  setInterval(async () => {
    try {
      beforeUpdateSitemaps();
      await updateAllSitemaps();
    } catch (error) {
      console.error('Error updating sitemaps:', error);
    }
  }, ONE_HOURS);
});
