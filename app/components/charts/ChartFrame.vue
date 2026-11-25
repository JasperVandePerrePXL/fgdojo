<script setup>
// Card around a chart: title, optional legend (for 2+ series), the chart itself and a data table view.
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
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th v-for="column in columns" :key="column.key" scope="col">{{ column.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in rows" :key="index">
              <td v-for="column in columns" :key="column.key">{{ row[column.key] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </figure>
</template>
