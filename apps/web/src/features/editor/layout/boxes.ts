/**
 * A layout's tiles as shares of the page, what its thumbnail draws. Apart from `tree.ts`: only the
 * layouts dialog, a chunk of its own, draws one.
 */
import { type Layout, type LayoutNode, type PanelId, scaled, shows } from './tree'

/** A panel's tile as a share of the page: `x, y, width, height`, each 0..1. */
export interface TileBox {
  readonly id: PanelId
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * The tiles of `layout` as they show, each a share of the page: a split gives its shown children
 * the space by their weights, the hidden ones none. What a layout's thumbnail draws.
 */
export function tileBoxes(layout: Layout): TileBox[] {
  const hidden = new Set(layout.hidden)
  const boxes: TileBox[] = []
  const place = (node: LayoutNode, x: number, y: number, width: number, height: number) => {
    if (node.kind === 'panel') {
      if (!hidden.has(node.id)) boxes.push({ id: node.id, x, y, width, height })
      return
    }
    const shown = node.children.flatMap((child, i) =>
      shows(child, hidden) ? [{ child, weight: node.weights[i] ?? 0 }] : [],
    )
    const shares = scaled(shown.map((s) => s.weight))
    let at = 0
    shown.forEach(({ child }, i) => {
      const share = shares[i] ?? 0
      if (node.dir === 'row') place(child, x + at * width, y, share * width, height)
      else place(child, x, y + at * height, width, share * height)
      at += share
    })
  }
  place(layout.root, 0, 0, 1, 1)
  return boxes
}
