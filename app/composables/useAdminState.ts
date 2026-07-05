type AdminStats = {
  totalKeys: number
  activeKeys: number
  totalAccounts: number
  activeAccounts: number
  totalRequests: number
  totalTokens: number
}

type ApiKey = {
  id: number
  key: string
  name: string | null
  is_active: number
  created_at: string | null
  updated_at?: string | null
}

type Account = {
  id: number
  name: string
  secure_1psid?: string | null
  secure_1psidts?: string | null
  proxy?: string | null
  is_active: number
  total_requests: number
  total_tokens: number
  last_used_at?: string | null
}

type UsageLog = {
  id: number
  created_at: string
  account_name?: string | null
  key_name?: string | null
  model?: string | null
  prompt_tokens: number
  completion_tokens: number
}

type AccountForm = {
  name: string
  secure_1psid: string
  secure_1psidts: string
  proxy: string
  is_active: number
}

type SessionResponse = { authenticated: boolean }
type LoginResponse = { success: boolean }
type StatsResponse = { stats: AdminStats; logs: UsageLog[] }
type KeysResponse = { keys: ApiKey[] }
type AccountsResponse = { accounts: Account[] }
type SettingsResponse = { settings?: Partial<Record<'global_proxy' | 'pool_strategy', string>> }
type FetchErrorWithData = { data?: { message?: string } }

const EMPTY_STATS: AdminStats = {
  totalKeys: 0,
  activeKeys: 0,
  totalAccounts: 0,
  activeAccounts: 0,
  totalRequests: 0,
  totalTokens: 0,
}

function createEmptyAccountForm(): AccountForm {
  return { name: '', secure_1psid: '', secure_1psidts: '', proxy: '', is_active: 1 }
}

export function useAdminState() {
  const password = useState('admin.password', () => '')
  const loading = useState('admin.loading', () => false)
  const error = useState('admin.error', () => '')
  const authenticated = useState('admin.authenticated', () => false)
  const initialized = useState('admin.initialized', () => false)

  const stats = useState<AdminStats>('admin.stats', () => ({ ...EMPTY_STATS }))
  const keys = useState<ApiKey[]>('admin.keys', () => [])
  const accounts = useState<Account[]>('admin.accounts', () => [])
  const logs = useState<UsageLog[]>('admin.logs', () => [])
  const newKeyName = useState('admin.newKeyName', () => '')

  const editingAccount = useState<Account | null>('admin.editingAccount', () => null)
  const accountForm = useState<AccountForm>('admin.accountForm', () => createEmptyAccountForm())

  const settingsForm = useState('admin.settingsForm', () => ({
    global_proxy: '',
    pool_strategy: 'round-robin',
  }))

  async function checkSession() {
    try {
      const r = await $fetch<SessionResponse>('/api/admin/session')
      authenticated.value = r.authenticated
      initialized.value = true
      if (r.authenticated) await loadData()
    } catch {
      authenticated.value = false
      initialized.value = true
    }
  }

  async function doLogin() {
    loading.value = true
    error.value = ''
    try {
      const r = await $fetch<LoginResponse>('/api/admin/login', { method: 'POST', body: { password: password.value } })
      if (r.success) {
        authenticated.value = true
        password.value = ''
        await loadData()
      }
    } catch (e) {
      const fetchError = e as FetchErrorWithData
      error.value = fetchError.data?.message || 'Login failed'
    } finally {
      loading.value = false
    }
  }

  async function doLogout() {
    await $fetch('/api/admin/logout', { method: 'POST' })
    authenticated.value = false
    stats.value = { ...EMPTY_STATS }
    keys.value = []
    accounts.value = []
    logs.value = []
    resetAccountForm()
    await navigateTo('/admin')
  }

  async function loadData() {
    try {
      const [statsRes, keysRes, accountsRes] = await Promise.all([
        $fetch<StatsResponse>('/api/admin/stats'),
        $fetch<KeysResponse>('/api/admin/keys'),
        $fetch<AccountsResponse>('/api/admin/accounts'),
      ])
      stats.value = statsRes.stats
      keys.value = keysRes.keys
      accounts.value = accountsRes.accounts
      logs.value = statsRes.logs
    } catch {
      // Keep the current dashboard visible if a refresh fails.
    }
  }

  async function loadSettings() {
    try {
      const r = await $fetch<SettingsResponse>('/api/admin/settings')
      settingsForm.value.global_proxy = r.settings?.global_proxy || ''
      settingsForm.value.pool_strategy = r.settings?.pool_strategy || 'round-robin'
    } catch {
      // Settings are optional at first boot.
    }
  }

  async function saveSettings() {
    try {
      await $fetch('/api/admin/settings', {
        method: 'PUT',
        body: {
          global_proxy: settingsForm.value.global_proxy,
          pool_strategy: settingsForm.value.pool_strategy,
        },
      })
    } catch {
      // Existing API returns status codes for failures.
    }
  }

  async function createKey() {
    try {
      await $fetch('/api/admin/keys', { method: 'POST', body: { name: newKeyName.value } })
      newKeyName.value = ''
      await loadData()
    } catch {
      // Existing API returns status codes for failures.
    }
  }

  async function deleteKey(id: number) {
    try {
      await $fetch(`/api/admin/keys/${id}`, { method: 'DELETE' })
      await loadData()
    } catch {
      // Existing API returns status codes for failures.
    }
  }

  function resetAccountForm() {
    editingAccount.value = null
    accountForm.value = createEmptyAccountForm()
  }

  async function saveAccount() {
    try {
      if (editingAccount.value) {
        await $fetch(`/api/admin/accounts/${editingAccount.value.id}`, {
          method: 'PUT',
          body: accountForm.value,
        })
      } else {
        await $fetch('/api/admin/accounts', {
          method: 'POST',
          body: accountForm.value,
        })
      }
      resetAccountForm()
      await loadData()
    } catch {
      // Existing API returns status codes for failures.
    }
  }

  function editAccount(a: Account) {
    editingAccount.value = a
    accountForm.value = {
      name: a.name,
      secure_1psid: a.secure_1psid || '',
      secure_1psidts: a.secure_1psidts || '',
      proxy: a.proxy || '',
      is_active: a.is_active,
    }
  }

  async function deleteAccount(id: number) {
    try {
      await $fetch(`/api/admin/accounts/${id}`, { method: 'DELETE' })
      await loadData()
    } catch {
      // Existing API returns status codes for failures.
    }
  }

  return {
    password,
    loading,
    error,
    authenticated,
    initialized,
    stats,
    keys,
    accounts,
    logs,
    newKeyName,
    editingAccount,
    accountForm,
    settingsForm,
    checkSession,
    doLogin,
    doLogout,
    loadData,
    loadSettings,
    saveSettings,
    createKey,
    deleteKey,
    resetAccountForm,
    saveAccount,
    editAccount,
    deleteAccount,
  }
}
