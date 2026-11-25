<script setup>
import PaginatedTable from '../PaginatedTable.vue';

// Card around a chart: title, optional legend (for 2+ series), the chart itself and a paged data table view.
defineProps({
  title: { type: String, required: true },
  /** `{ name, color }[]`; the legend is shown for two or more series. */
  series: { type: Array, default: () => [] },
  /** Table view: `{ key, label }[]` columns and plain row objects. */
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
});
</script>

<template>
  <figure class="card chart-card">
    <figcaption>
      <h3>{{ title }}</h3>
      <ul v-if="series.length > 1" class="legend">
        <li v-for="item in series" :key="item.name">
          <i :style="{ background: item.color }"></i>{{ item.name }}
        </li>
      </ul>
    </figcaption>
    <slot />
    <details class="data-table">
      <summary>Show data</summary>
      <PaginatedTable :columns="columns" :rows="rows" :label="title" />
    </details>
  </figure>
</template>
