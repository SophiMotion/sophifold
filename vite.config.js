import {defineConfig} from 'vite';
export default defineConfig({base:process.env.BASE_PATH||'/',build:{rollupOptions:{output:{manualChunks:{three:['three','three/addons/controls/OrbitControls.js']}}}},optimizeDeps:{noDiscovery:true,include:[]}});
