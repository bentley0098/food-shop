import { describe, expect, it } from 'vitest'
import { AISLES, aisleSortIndex } from '../../shared/constants/aisles'

describe('aisles', () => {
  it('has all eleven aisles, in supermarket walk order', () => {
    expect(AISLES).toHaveLength(11)
    expect(AISLES.map((aisle) => aisle.id)).toEqual([
      'produce',
      'bakery',
      'meat_fish',
      'dairy_eggs',
      'chilled',
      'frozen',
      'cupboard',
      'herbs_spices',
      'drinks',
      'household',
      'other',
    ])
  })

  it('sorts by walk order, unknown aisles last', () => {
    expect(aisleSortIndex('bakery')).toBeLessThan(aisleSortIndex('frozen'))
    expect(aisleSortIndex('nonexistent')).toBe(AISLES.length)
  })
})
