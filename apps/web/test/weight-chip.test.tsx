import { describe, expect, it } from 'bun:test'
import { OPEN_WEIGHT, WEIGHT_CLASSES } from '@asmbots/protocol'
import { fireEvent, render, screen } from '@testing-library/react'
import { useDom } from '../../../packages/ui/test/dom'
import { sizeReading } from '../src/features/editor/EditorToolbar'
import { WEIGHT_SHORT, WeightChip, weightBounds } from '../src/features/hills/WeightChip'

useDom()

const [light, middle, , superHeavy] = WEIGHT_CLASSES

describe('WeightChip', () => {
  it('reads the short name, and its tooltip the full name and bounds', async () => {
    render(<WeightChip weight={middle} />)
    const chip = screen.getByText('middle')
    fireEvent.pointerEnter(chip, { pointerType: 'mouse' })
    const tip = await screen.findByRole('tooltip', {}, { timeout: 2_000 })
    expect(tip.textContent).toBe('middleweight · 513 to 1,024 bytes')
  })

  it('has a short name for every class and open weight', () => {
    expect([...WEIGHT_CLASSES, OPEN_WEIGHT].map((c) => WEIGHT_SHORT[c.slug])).toEqual([
      'light',
      'middle',
      'heavy',
      'super',
      'open',
    ])
    expect(weightBounds(OPEN_WEIGHT)).toBe('open weight · 1 to 4,096 bytes')
  })
})

describe('sizeReading', () => {
  it('names the class beside the size', () => {
    expect(sizeReading({ size: 23 })).toEqual({
      variant: 'neutral',
      text: '23 B · light',
      title: weightBounds(light),
    })
    expect(sizeReading({ size: 1500 }).text).toBe('1,500 B · heavy')
  })

  it('warns within 10% under the class limit, and names the class past it', () => {
    expect(sizeReading({ size: 460 }).variant).toBe('neutral')
    expect(sizeReading({ size: 470 })).toEqual({
      variant: 'warn',
      text: '470 B · light',
      title: '42 bytes under the lightweight limit; past 512 it is a middleweight',
    })
    expect(sizeReading({ size: 513 })).toEqual({
      variant: 'neutral',
      text: '513 B · middle',
      title: weightBounds(middle),
    })
    expect(sizeReading({ size: 4000 })).toEqual({
      variant: 'warn',
      text: '4,000 B · super',
      title: '96 bytes under the super-heavy limit; past 4,096 it is too big for any hill',
    })
    expect(sizeReading({ size: superHeavy.max }).variant).toBe('warn')
  })

  it('turns danger only past 4,096 bytes', () => {
    expect(sizeReading({ size: 5000 })).toEqual({
      variant: 'danger',
      text: '5,000 B · over',
      title: '904 bytes over the 4,096-byte cap: trim it',
    })
  })

  it('reads assembling, and no size while there are errors', () => {
    expect(sizeReading(null)).toMatchObject({
      variant: 'neutral',
      text: '… B',
      title: 'assembling',
    })
    expect(sizeReading({ size: null })).toMatchObject({ variant: 'neutral', text: '— B' })
  })
})
