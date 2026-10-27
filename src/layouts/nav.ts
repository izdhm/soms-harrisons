import type { ComponentType, SVGProps } from 'react'
import {
  BoxIcon,
  BranchIcon,
  CustomersIcon,
  DashboardIcon,
  InvoiceIcon,
  OrdersIcon,
  ReportIcon,
  SettingsIcon,
  TruckIcon,
  UsersShieldIcon,
} from '../components/Icons'

export interface NavItem {
  path: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  /** Placeholder module, not built in this release. */
  planned?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ path: '/app/dashboard', label: 'Dashboard', icon: DashboardIcon }],
  },
  {
    label: 'Sales',
    items: [
      { path: '/app/orders', label: 'Sales orders', icon: OrdersIcon },
      { path: '/app/customers', label: 'Customers', icon: CustomersIcon, planned: true },
      { path: '/app/invoices', label: 'Invoices', icon: InvoiceIcon, planned: true },
      { path: '/app/deliveries', label: 'Deliveries', icon: TruckIcon, planned: true },
    ],
  },
  {
    label: 'Operations',
    items: [
      { path: '/app/products', label: 'Products', icon: BoxIcon, planned: true },
      { path: '/app/branches', label: 'Branches', icon: BranchIcon, planned: true },
      { path: '/app/reports', label: 'Reports', icon: ReportIcon, planned: true },
    ],
  },
  {
    label: 'Administration',
    items: [
      { path: '/app/users', label: 'Users and roles', icon: UsersShieldIcon, planned: true },
      { path: '/app/settings', label: 'System settings', icon: SettingsIcon },
    ],
  },
]

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items.map((item) => ({ ...item, group: g.label })))

export const PLANNED_MODULES = NAV_ITEMS.filter((i) => i.planned)

export function findNavItem(pathname: string) {
  return NAV_ITEMS.find((i) => pathname === i.path || pathname.startsWith(`${i.path}/`))
}
