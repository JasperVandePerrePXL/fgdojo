<script setup>
// Table with 10 rows per page (or `pageSize`) and previous/next buttons. The first column is the row header.
// Goes back to page 1 when the rows change (e.g. another date range is selected).
import { computed, ref, watch } from 'vue';
import { PAGE_SIZE, paginate } from '../utils/pagination.js';
import PagerNav from './PagerNav.vue';

const props = defineProps({
  /** `{ key, label }[]`. */
  columns: { type: Array, required: true },
  /** Plain objects with a value per column key. */
  rows: { type: Array, required: true },
  /** Accessible name of the table. */
  label: { type: String, required: true },
  /** Rows per page. */
  pageSize: { type: Number, default: PAGE_SIZE },
});

const page = ref(1);
watch(
  () => props.rows,
  () => (page.value = 1),
);
const view = computed(() => paginate(props.rows, page.value, props.pageSize));
</script>

<template>
  <div class="table-scroll">
    <table :aria-label="label">
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key" scope="col">{{ column.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in view.rows" :key="index">
          <template v-for="(column, c) in columns" :key="column.key">
            <th v-if="c === 0" scope="row">{{ row[column.key] }}</th>
            <td v-else>{{ row[column.key] }}</td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
  <PagerNav :view="view" :label="`${label} pages`" @page="page = $event" />
</template>
