import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        allowedHosts: ['bioreactor.local'],
    },
    resolve: {
        alias: {
            'react-chartjs-2': 'react-chartjs-2',
            'chart.js': 'chart.js',
        },
    },
})

