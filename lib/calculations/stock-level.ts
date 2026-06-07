import type { StockMovement } from '@/types/database'

// Derive current stock level from movement log
// This is the ONLY way stock levels are calculated — never stored directly
export function deriveStockLevel(
  movements: StockMovement[],
  ingredientId: string
): number {
  const relevant = movements
    .filter((m) => m.ingredient_id === ingredientId)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

  let level = 0

  for (const movement of relevant) {
    if (movement.is_absolute) {
      // 'count' movements set the absolute level
      level = movement.quantity
    } else {
      // All other movements are deltas
      switch (movement.movement_type) {
        case 'delivery':
          level += movement.quantity
          break
        case 'waste':
        case 'sale':
          level -= Math.abs(movement.quantity)
          break
        case 'adjustment':
          level += movement.quantity // can be negative
          break
      }
    }
  }

  return Math.max(0, level)
}

// Build a map of ingredientId -> derived stock level in a single pass.
// More efficient than calling deriveStockLevel per ingredient when rendering
// the full inventory list.
export function deriveAllStockLevels(
  movements: StockMovement[]
): Map<string, number> {
  const sorted = [...movements].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  const levels = new Map<string, number>()

  for (const movement of sorted) {
    const current = levels.get(movement.ingredient_id) ?? 0
    if (movement.is_absolute) {
      levels.set(movement.ingredient_id, movement.quantity)
      continue
    }
    switch (movement.movement_type) {
      case 'delivery':
        levels.set(movement.ingredient_id, current + movement.quantity)
        break
      case 'waste':
      case 'sale':
        levels.set(
          movement.ingredient_id,
          current - Math.abs(movement.quantity)
        )
        break
      case 'adjustment':
        levels.set(movement.ingredient_id, current + movement.quantity)
        break
    }
  }

  // Clamp negatives to zero.
  for (const [id, level] of levels) {
    if (level < 0) levels.set(id, 0)
  }

  return levels
}

// Most recent 'count' movement timestamp for an ingredient, or null.
export function lastCountDate(
  movements: StockMovement[],
  ingredientId: string
): string | null {
  const counts = movements
    .filter(
      (m) => m.ingredient_id === ingredientId && m.movement_type === 'count'
    )
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  return counts[0]?.created_at ?? null
}
