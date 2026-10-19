/**
 * Split photos into justified rows. Each row's width ratio (sum of the photos'
 * width / height) is kept close to `targetRatio`, so rows come out roughly the
 * same height. Within a row, giving each photo a grid column of `ratio` fr
 * makes every photo the same height without cropping.
 *
 * Uses an exact partition (O(n²)) rather than greedy filling, so the last row
 * is not left with a lone, oversized photo when a better split exists.
 */
export function justifiedRows(ratios: number[], targetRatio: number): number[][] {
  const n = ratios.length
  if (n === 0) return []

  const cost = new Array<number>(n + 1).fill(Infinity)
  const cut = new Array<number>(n + 1).fill(0)
  cost[0] = 0

  for (let end = 1; end <= n; end++) {
    let sum = 0
    for (let start = end - 1; start >= 0; start--) {
      sum += ratios[start]
      const c = cost[start] + (sum - targetRatio) ** 2
      if (c < cost[end]) {
        cost[end] = c
        cut[end] = start
      }
      // Rows already far wider than the target only get worse.
      if (sum > targetRatio * 2) break
    }
  }

  const rows: number[][] = []
  for (let end = n; end > 0; end = cut[end]) {
    const row: number[] = []
    for (let i = cut[end]; i < end; i++) row.push(i)
    rows.unshift(row)
  }
  return rows
}
