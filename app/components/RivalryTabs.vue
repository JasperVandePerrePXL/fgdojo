<script setup>
// "Biggest rivalries": one tab per game with that game's most played 1v1 matchups.
// The selected game is owned by the parent (reported with `select`).
import { computed } from 'vue';

const props = defineProps({
  /** `{ name, color, rivalries }[]` in the fixed game order. */
  games: { type: Array, required: true },
  /** Name of the open tab. */
  selected: { type: String, default: null },
});
const emit = defineEmits(['select']);

const current = computed(() => props.games.find((game) => game.name === props.selected) ?? props.games[0]);
const panelId = 'rivalry-panel';

/** Arrow keys move between tabs (standard tablist keyboard behaviour). */
function onKeydown(event, index) {
  const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
  if (!step) return;
  const next = props.games[(index + step + props.games.length) % props.games.length];
  emit('select', next.name);
  event.currentTarget.parentElement.children[props.games.indexOf(next)]?.focus();
}
</script>

<template>
  <section class="card table-card">
    <h3>Biggest rivalries</h3>
    <div class="tabs" role="tablist" aria-label="Game">
      <button
        v-for="(game, index) in games"
        :key="game.name"
        type="button"
        role="tab"
        class="tab"
        :aria-selected="game.name === current?.name"
        :aria-controls="panelId"
        :tabindex="game.name === current?.name ? 0 : -1"
        @click="emit('select', game.name)"
        @keydown="onKeydown($event, index)"
      >
        <i :style="{ background: game.color }"></i>{{ game.name }}
      </button>
    </div>

    <div :id="panelId" role="tabpanel">
      <ol v-if="current?.rivalries.length" class="rivalries">
        <li v-for="rivalry in current.rivalries" :key="`${rivalry.playerA}-${rivalry.playerB}`">
          <span class="side-a" :class="{ leads: rivalry.winsA > rivalry.winsB }">{{ rivalry.playerA }}</span>
          <b>{{ rivalry.winsA }} – {{ rivalry.winsB }}</b>
          <span class="side-b" :class="{ leads: rivalry.winsB > rivalry.winsA }">{{ rivalry.playerB }}</span>
          <small>{{ rivalry.sets }} {{ rivalry.sets === 1 ? 'set' : 'sets' }}</small>
        </li>
      </ol>
      <p v-else class="empty compact">No rivalries for this game yet.</p>
    </div>

    <p class="note">Most played 1v1 matchups in this game across all seasons (disqualifications excluded).</p>
  </section>
</template>
