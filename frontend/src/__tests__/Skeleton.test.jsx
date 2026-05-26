import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Skeleton from '../components/ui/Skeleton'

describe('Skeleton component', () => {
  it('renders without crashing', () => {
    render(<Skeleton />)
    const el = document.querySelector('[aria-hidden="true"]')
    expect(el).toBeTruthy()
  })

  it('applies shimmer class', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toHaveClass('shimmer')
  })

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="my-custom-class" />)
    expect(container.firstChild).toHaveClass('my-custom-class')
    expect(container.firstChild).toHaveClass('shimmer')
  })

  it('uses circle border-radius for circle variant', () => {
    const { container } = render(<Skeleton variant="circle" />)
    const style = container.firstChild.style
    expect(style.borderRadius).toBe('50%')
  })

  it('uses default box border-radius for box variant', () => {
    const { container } = render(<Skeleton variant="box" />)
    const style = container.firstChild.style
    expect(style.borderRadius).toBe('10px')
  })

  it('applies width and height props', () => {
    const { container } = render(<Skeleton width={200} height={50} />)
    const style = container.firstChild.style
    expect(style.width).toBe('200px')
    expect(style.height).toBe('50px')
  })

  it('applies string width like "100%"', () => {
    const { container } = render(<Skeleton width="75%" height="100%" />)
    const style = container.firstChild.style
    expect(style.width).toBe('75%')
    expect(style.height).toBe('100%')
  })

  it('is aria-hidden for accessibility', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('applies custom style object', () => {
    const { container } = render(<Skeleton style={{ opacity: 0.5 }} />)
    const style = container.firstChild.style
    expect(style.opacity).toBe('0.5')
  })
})
