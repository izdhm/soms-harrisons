import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SETTINGS_STORAGE_KEY } from './settings/defaults'
import { installApiMock } from './test/apiMock'
import { makeOrder } from './test/fixtures'
import { renderApp, resetBrowserState } from './test/render'

const ORDERS = [
  makeOrder(),
  makeOrder({
    SalesId: 'SO-MOCK-00002',
    SalesName: 'John Distribution Sdn Bhd',
    InventSiteId: 'C30',
    SalesStatus: 'Invoiced',
    HAR_TotalSOAmount: 274.7,
    HAR_BalanceAmount: 0,
  }),
  makeOrder({
    SalesId: 'SO-MOCK-00003',
    SalesName: 'Borneo Fresh Trading',
    SalesStatus: 'Cancelled',
    HAR_TotalSOAmount: 63.0,
  }),
]

beforeEach(() => {
  resetBrowserState()
  installApiMock(ORDERS)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Public pages and sign in', () => {
  it('opens on the sign-in page', () => {
    renderApp('/', { signedIn: false })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sign in')
    expect(screen.getByLabelText('Work email')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tom Fisk' })).toHaveAttribute(
      'href',
      'https://www.pexels.com/photo/aerial-view-of-cargo-ship-1554646/',
    )
  })

  it('sends signed-out visitors to the sign-in page', async () => {
    renderApp('/app/orders', { signedIn: false })

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
  })

  it('rejects a wrong password', async () => {
    const user = userEvent.setup()
    renderApp('/', { signedIn: false })

    await user.type(screen.getByLabelText('Work email'), 'nobody@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.')
    expect(window.location.pathname).toBe('/')
  })

  it('keeps the old sign-in link working', () => {
    renderApp('/login', { signedIn: false })

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('signs in with the demo account and returns to the requested page', async () => {
    const user = userEvent.setup()
    renderApp('/app/orders', { signedIn: false })

    await user.click(await screen.findByRole('button', { name: 'Use demo account' }))
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Sales orders' }, { timeout: 3000 })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/app/orders')
    expect(sessionStorage.getItem('soms.session')).toContain('u-0001')
  })

  it('signs out from the account menu', async () => {
    const user = userEvent.setup()
    renderApp('/app/dashboard')

    await user.click(await screen.findByRole('button', { name: 'Account menu' }))
    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(sessionStorage.getItem('soms.session')).toBeNull()
  })
})

describe('Signed-in system', () => {
  it('builds the dashboard tiles from the full order list', async () => {
    renderApp('/app/dashboard')

    const tile = async (label: string) =>
      (await screen.findByText(label, { selector: '.tile__label' })).closest('.tile') as HTMLElement

    expect(within(await tile('Total orders')).getByText('3')).toBeInTheDocument()
    expect(within(await tile('Open / pending')).getByText('1')).toBeInTheDocument()
    expect(within(await tile('Cancelled')).getByText('1')).toBeInTheDocument()
    expect(within(await tile('Total order value')).getByTitle('RM 500.05')).toBeInTheDocument()
    expect(within(await tile('Outstanding balance')).getByTitle('RM 162.35')).toBeInTheDocument()
    expect(screen.getAllByText('Borneo Fresh Trading').length).toBeGreaterThan(0)
  })

  it('greets the signed-in user with the date and time', async () => {
    renderApp('/app/dashboard')

    const banner = await screen.findByRole('region', { name: 'Welcome' })
    expect(within(banner).getByRole('heading')).toHaveTextContent(/^Good (morning|afternoon|evening), Amir$/)
    expect(banner.querySelector('time')).toHaveTextContent(/^\d{1,2}:\d{2}:\d{2} (AM|PM)$/)
    expect(within(banner).getByText('Malaysia (UTC+08:00)')).toBeInTheDocument()
  })

  it('shows a placeholder for planned modules', async () => {
    renderApp('/app/invoices')

    expect(await screen.findByRole('heading', { name: 'Invoices' })).toBeInTheDocument()
    const card = screen.getByText('Invoices is planned for a later release').closest('.placeholder') as HTMLElement
    expect(within(card).getByRole('link', { name: /Sales orders/ })).toHaveAttribute('href', '/app/orders')
  })

  it('saves system settings and keeps them after a reload', async () => {
    const user = userEvent.setup()
    const { unmount } = renderApp('/app/settings')

    const company = await screen.findByLabelText('Company name')
    expect(window.location.pathname).toBe('/app/settings/general')
    await user.clear(company)
    await user.type(company, 'Harrisons Test Branch')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Settings saved.')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)!).general.companyName).toBe(
      'Harrisons Test Branch',
    )

    unmount()
    renderApp('/app/settings/general')
    expect(await screen.findByLabelText('Company name')).toHaveValue('Harrisons Test Branch')
  })

  it('keeps the API key locked and ignores a key saved by an older version', async () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ api: { apiKey: 'old-saved-key' } }))
    renderApp('/app/settings/api')

    expect(await screen.findByLabelText('API key')).toBeDisabled()
    expect(screen.queryByRole('button', { name: /show value/i })).not.toBeInTheDocument()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    for (const [, init] of vi.mocked(fetch).mock.calls) {
      expect((init?.headers as Record<string, string>)['x-assessment-key']).toBe('test-key')
    }
  })

  it('blocks saving an invalid value', async () => {
    const user = userEvent.setup()
    renderApp('/app/settings/orders')

    const threshold = await screen.findByLabelText('High-value threshold')
    await user.clear(threshold)
    await user.type(threshold, '0')

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })
})
