import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock lucide-react icons to avoid complex SVG rendering
vi.mock('lucide-react', () => ({
  Globe: () => <span data-testid="icon-globe" />,
  ChevronDown: () => <span data-testid="icon-chevron-down" />,
}))

// Mock context
const mockLotteryContext = {
  lotteryType: 'thai',
  setLotteryType: vi.fn(),
}

vi.mock('../context/LotteryContext', () => ({
  useLottery: () => mockLotteryContext,
}))

import LotterySwitcher from '../components/common/LotterySwitcher'

describe('LotterySwitcher component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLotteryContext.lotteryType = 'thai'
  })

  it('renders without crashing', () => {
    render(<LotterySwitcher />)
    // Should render the current lottery type label
    expect(document.body).toBeTruthy()
  })

  it('shows thai lottery label when lotteryType is thai', () => {
    mockLotteryContext.lotteryType = 'thai'
    render(<LotterySwitcher />)
    // Look for "ไทย" or "Thai" label somewhere in the component
    expect(document.body.textContent).toMatch(/ไทย|Thai/i)
  })

  it('shows lao lottery label when lotteryType is lao', () => {
    mockLotteryContext.lotteryType = 'lao'
    render(<LotterySwitcher />)
    expect(document.body.textContent).toMatch(/ลาว|Lao/i)
  })
})
