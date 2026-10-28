
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('Frontend testing setup', () => {
  it('renders a MindBlaze heading', () => {
    render(<h1>MindBlaze</h1>)

    expect(
      screen.getByRole('heading', { name: 'MindBlaze' })
    ).toBeInTheDocument()
  })
})
