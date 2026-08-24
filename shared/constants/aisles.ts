/**
 * The eleven aisles, in supermarket walk order (DESIGN.md §2.1).
 * The shopping list renders groups in exactly this order, always.
 */
export const AISLES = [
  { id: 'produce', label: 'Produce', dot: '#4E7A3E', icon: 'carrot' },
  { id: 'bakery', label: 'Bakery', dot: '#B07A34', icon: 'croissant' },
  { id: 'meat_fish', label: 'Meat & Fish', dot: '#9B3B48', icon: 'fish' },
  { id: 'dairy_eggs', label: 'Dairy & Eggs', dot: '#C9A227', icon: 'egg' },
  { id: 'chilled', label: 'Chilled', dot: '#4A7E8C', icon: 'refrigerator' },
  { id: 'frozen', label: 'Frozen', dot: '#5C74A8', icon: 'snowflake' },
  { id: 'cupboard', label: 'Cupboard', dot: '#8A6A46', icon: 'package' },
  { id: 'herbs_spices', label: 'Herbs & Spices', dot: '#6B7F3A', icon: 'leaf' },
  { id: 'drinks', label: 'Drinks', dot: '#7A5AA0', icon: 'cup-soda' },
  { id: 'household', label: 'Household', dot: '#6E6558', icon: 'spray-can' },
  { id: 'other', label: 'Other', dot: '#8C8375', icon: 'circle-dashed' },
] as const satisfies readonly { id: string; label: string; dot: string; icon: string }[]

export type AisleId = (typeof AISLES)[number]['id']

const AISLE_ORDER = new Map<string, number>(AISLES.map((aisle, index) => [aisle.id, index]))

export function aisleSortIndex(id: string): number {
  return AISLE_ORDER.get(id) ?? AISLES.length
}

export function getAisle(id: string) {
  return AISLES.find((aisle) => aisle.id === (id as AisleId))
}
