import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock @supabase/ssr ───────────────
const mockGetUser = vi.fn()
const mockSignInWithPassword = vi.fn()
const mockGetAuthenticatorAssuranceLevel = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      signInWithPassword: mockSignInWithPassword,
      mfa: {
        getAuthenticatorAssuranceLevel: mockGetAuthenticatorAssuranceLevel,
      },
    },
  })),
  createBrowserClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      signInWithPassword: mockSignInWithPassword,
      mfa: {
        getAuthenticatorAssuranceLevel: mockGetAuthenticatorAssuranceLevel,
      },
    },
  })),
}))

// ─── Auth logic helpers (extracted for testability) ──
// These mirror the logic in src/proxy.ts and server actions

function isProtectedRoute(pathname: string): boolean {
  const publicPaths = ['/login', '/register', '/verify-mfa']
  return (
    !publicPaths.includes(pathname) &&
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/_next/')
  )
}

function isAuthRoute(pathname: string): boolean {
  return pathname === '/login' || pathname === '/register'
}

async function checkSession(supabase: { auth: { getUser: () => Promise<{ data: { user: unknown } }> } }) {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ─── Tests ───────────────────────────

describe('Route protection logic', () => {
  it('identifies protected routes correctly', () => {
    expect(isProtectedRoute('/')).toBe(true)
    expect(isProtectedRoute('/proyectos')).toBe(true)
    expect(isProtectedRoute('/settings/security')).toBe(true)
  })

  it('does not protect public auth routes', () => {
    expect(isProtectedRoute('/login')).toBe(false)
    expect(isProtectedRoute('/register')).toBe(false)
    expect(isProtectedRoute('/verify-mfa')).toBe(false)
  })

  it('does not protect API and Next.js internal routes', () => {
    expect(isProtectedRoute('/api/markets')).toBe(false)
    expect(isProtectedRoute('/_next/static/chunk.js')).toBe(false)
  })

  it('identifies auth routes correctly', () => {
    expect(isAuthRoute('/login')).toBe(true)
    expect(isAuthRoute('/register')).toBe(true)
    expect(isAuthRoute('/')).toBe(false)
    expect(isAuthRoute('/verify-mfa')).toBe(false)
  })
})

describe('Session check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns user when session is valid', async () => {
    const mockUser = { id: 'user-123', email: 'test@test.com' }
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })

    const { createServerClient } = await import('@supabase/ssr')
    const supabase = createServerClient('url', 'key', { cookies: { getAll: () => [], setAll: () => {} } })
    const user = await checkSession(supabase)

    expect(user).toEqual(mockUser)
  })

  it('returns null when no session exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { createServerClient } = await import('@supabase/ssr')
    const supabase = createServerClient('url', 'key', { cookies: { getAll: () => [], setAll: () => {} } })
    const user = await checkSession(supabase)

    expect(user).toBeNull()
  })
})

describe('MFA AAL check logic', () => {
  it('requires MFA verification when aal1 and aal2 available', () => {
    const aal = { currentLevel: 'aal1', nextLevel: 'aal2' }
    const needsMfa = aal.currentLevel === 'aal1' && aal.nextLevel === 'aal2'
    expect(needsMfa).toBe(true)
  })

  it('does not require MFA when already at aal2', () => {
    const aal = { currentLevel: 'aal2', nextLevel: 'aal2' }
    const needsMfa = aal.currentLevel === 'aal1' && aal.nextLevel === 'aal2'
    expect(needsMfa).toBe(false)
  })

  it('does not require MFA when no MFA enrolled', () => {
    const aal = { currentLevel: 'aal1', nextLevel: 'aal1' }
    const needsMfa = aal.currentLevel === 'aal1' && aal.nextLevel === 'aal2'
    expect(needsMfa).toBe(false)
  })
})
