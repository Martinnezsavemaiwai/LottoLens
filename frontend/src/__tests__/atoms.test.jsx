import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CTip, DBall } from '../components/ui/atoms'

describe('CTip (Custom Recharts Tooltip)', () => {
  it('returns null when not active', () => {
    const { container } = render(
      <CTip active={false} payload={[{ name: 'count', value: 10 }]} label="5" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('returns null when payload is empty', () => {
    const { container } = render(
      <CTip active={true} payload={[]} label="5" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('returns null when payload is undefined', () => {
    const { container } = render(
      <CTip active={true} payload={undefined} label="5" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders label and payload when active', () => {
    render(
      <CTip
        active={true}
        payload={[{ name: 'count', value: 42, color: '#ff0' }]}
        label="Digit 5"
      />
    )
    expect(screen.getByText('Digit 5')).toBeInTheDocument()
    expect(screen.getByText(/count: 42/i)).toBeInTheDocument()
  })

  it('renders multiple payload items', () => {
    render(
      <CTip
        active={true}
        payload={[
          { name: 'count', value: 10, color: '#f00' },
          { name: 'zscore', value: 1.5, color: '#0f0' },
        ]}
        label="Digit 3"
      />
    )
    expect(screen.getByText(/count: 10/i)).toBeInTheDocument()
    expect(screen.getByText(/zscore: 1.5/i)).toBeInTheDocument()
  })
})

describe('DBall (Digit Ball)', () => {
  it('renders digit value', () => {
    render(<DBall d={7} cls="hot" count={15} />)
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('renders count with x suffix', () => {
    render(<DBall d={3} cls="cold" count={8} />)
    expect(screen.getByText('8x')).toBeInTheDocument()
  })

  it('renders label when provided', () => {
    render(<DBall d={5} cls="hot" count={20} label="Hot digit" />)
    expect(screen.getByText('Hot digit')).toBeInTheDocument()
  })

  it('does not render label when not provided', () => {
    const { container } = render(<DBall d={5} cls="hot" count={20} />)
    // Only the digit container, dball-sub — no label div
    const labelEl = container.querySelector('[style*="font-size:9"]')
    expect(labelEl).toBeNull()
  })

  it('applies cls as className to dball element', () => {
    const { container } = render(<DBall d={2} cls="over" count={5} />)
    const ball = container.querySelector('.dball')
    expect(ball).toHaveClass('over')
  })

  it('renders digit 0', () => {
    render(<DBall d={0} cls="hot" count={25} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
