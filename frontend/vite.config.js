import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: true, // listen on all network interfaces
        port: 5173, // optional, just to be explicit
        strictPort: true, // fail if the port is already in use
        allowedHosts: ['bioreactor.local'],
        hmr: {
            host: 'bioreactor.local', // HMR WebSocket should connect here
            protocol: 'ws',            // use WebSocket
        },
    },
    resolve: {
        alias: {
            'react-chartjs-2': 'react-chartjs-2',
            'chart.js': 'chart.js',
        },
    },
});
