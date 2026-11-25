// Paging for the data tables on the stats page.

/** Rows per table page. */
export const PAGE_SIZE = 10;

/**
 * One page of rows.
 * @param {any[]} rows
 * @param {number} page 1-based; clamped to the available pages.
 * @returns {{ rows: any[], page: number, pageCount: number, first: number, last: number, total: number }}
 *   `first`/`last` are 1-based row numbers for "1–10 of 20" (0 when there are no rows).
 */
export function paginate(rows, page, size = PAGE_SIZE) {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * size;
  const pageRows = rows.slice(start, start + size);
  return {
    rows: pageRows,
    page: current,
    pageCount,
    first: total ? start + 1 : 0,
    last: start + pageRows.length,
    total,
  };
}
