// Entry point of the stats page (/stats.html), opened with the "Stats" button in the top bar.
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import StatsPage from './StatsPage.vue';
import '../styles.css';

createApp(StatsPage).use(createPinia()).mount('#app');
