// Must be imported before anything from 'cesium': tells Cesium where vite.config.ts copied
// its workers and assets.
(window as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = `${import.meta.env.BASE_URL}cesium/`;
