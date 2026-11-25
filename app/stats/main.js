// Entry point of the stats page (/stats.html). It is only reachable by its link.
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import StatsPage from './StatsPage.vue';
import '../styles.css';

createApp(StatsPage).use(createPinia()).mount('#app');
