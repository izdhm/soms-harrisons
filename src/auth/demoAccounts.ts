// Seed accounts for the demo. There is no user API in the assessment, so sign-in is
// checked in the browser against this list. Never use this pattern for real credentials.

export interface DemoAccount {
  id: string
  name: string
  email: string
  password: string
  role: string
  department: string
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'u-0001',
    name: 'Amir Hakim',
    email: 'demo@soms.test',
    password: 'Demo@2026',
    role: 'Sales Operations Manager',
    department: 'Sales Operations',
  },
]

export const PRIMARY_DEMO_ACCOUNT = DEMO_ACCOUNTS[0]
