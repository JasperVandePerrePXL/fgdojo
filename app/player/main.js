// Entry point of the player page (/player.html?id=…), opened from a name in the ranking.
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PlayerPage from './PlayerPage.vue';
import '../styles.css';

createApp(PlayerPage).use(createPinia()).mount('#app');
