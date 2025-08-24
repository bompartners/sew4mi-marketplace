# Zustand Documentation

Zustand is a small, fast, and scalable state management solution for React. It's used in Sew4Mi for managing global application state with a simple and intuitive API.

## Core Concepts for Sew4Mi

### Simple State Management
- **Minimal boilerplate**: Less code compared to Redux or Context API
- **TypeScript friendly**: Excellent TypeScript support out of the box
- **No providers needed**: Direct import and use in components
- **Devtools support**: Integration with Redux DevTools for debugging

### Reactive Updates
- **Selective subscriptions**: Components re-render only when subscribed state changes
- **Computed values**: Derived state with automatic updates
- **Async actions**: Built-in support for async operations
- **Middleware support**: Persistence, logging, and more

## Key Integration Patterns

### Authentication Store

```typescript
// stores/auth.store.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { AuthService } from '@/services/auth.service'

interface User {
  id: string
  email: string
  name: string
  role: 'customer' | 'tailor' | 'admin'
  profileImage?: string
  phone?: string
  location?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      immer((set, get) => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,

        login: async (email: string, password: string) => {
          set((state) => {
            state.isLoading = true
          })

          try {
            const { user } = await AuthService.login(email, password)
            
            set((state) => {
              state.user = user
              state.isAuthenticated = true
              state.isLoading = false
            })
          } catch (error) {
            set((state) => {
              state.isLoading = false
            })
            throw error
          }
        },

        register: async (data: RegisterData) => {
          set((state) => {
            state.isLoading = true
          })

          try {
            const { user } = await AuthService.register(data)
            
            set((state) => {
              state.user = user
              state.isAuthenticated = true
              state.isLoading = false
            })
          } catch (error) {
            set((state) => {
              state.isLoading = false
            })
            throw error
          }
        },

        logout: async () => {
          await AuthService.logout()
          
          set((state) => {
            state.user = null
            state.isAuthenticated = false
          })
        },

        updateProfile: async (data: Partial<User>) => {
          const currentUser = get().user
          if (!currentUser) return

          try {
            const updatedUser = await AuthService.updateProfile(data)
            
            set((state) => {
              state.user = updatedUser
            })
          } catch (error) {
            throw error
          }
        },

        checkAuth: async () => {
          set((state) => {
            state.isLoading = true
          })

          try {
            const user = await AuthService.getCurrentUser()
            
            set((state) => {
              state.user = user
              state.isAuthenticated = !!user
              state.isLoading = false
            })
          } catch (error) {
            set((state) => {
              state.user = null
              state.isAuthenticated = false
              state.isLoading = false
            })
          }
        },
      })),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'auth-store' }
  )
)

// Usage in components
function LoginForm() {
  const { login, isLoading } = useAuthStore()
  
  const handleSubmit = async (email: string, password: string) => {
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (error) {
      toast.error('Login failed')
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}
```

### Shopping Cart Store

```typescript
// stores/cart.store.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface CartItem {
  id: string
  tailorId: string
  tailorName: string
  garmentType: string
  measurements: Record<string, number>
  customizations: string[]
  estimatedPrice: number
  deadline: string
  instructions?: string
}

interface CartState {
  items: CartItem[]
  
  // Actions
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (itemId: string) => void
  updateItem: (itemId: string, updates: Partial<CartItem>) => void
  clearCart: () => void
  
  // Computed values
  getTotalItems: () => number
  getTotalPrice: () => number
  getItemsByTailor: (tailorId: string) => CartItem[]
}

export const useCartStore = create<CartState>()(
  devtools(
    persist(
      immer((set, get) => ({
        items: [],

        addItem: (itemData) => {
          const item: CartItem = {
            ...itemData,
            id: crypto.randomUUID(),
          }

          set((state) => {
            state.items.push(item)
          })
        },

        removeItem: (itemId) => {
          set((state) => {
            state.items = state.items.filter((item) => item.id !== itemId)
          })
        },

        updateItem: (itemId, updates) => {
          set((state) => {
            const itemIndex = state.items.findIndex((item) => item.id === itemId)
            if (itemIndex !== -1) {
              Object.assign(state.items[itemIndex], updates)
            }
          })
        },

        clearCart: () => {
          set((state) => {
            state.items = []
          })
        },

        getTotalItems: () => {
          return get().items.length
        },

        getTotalPrice: () => {
          return get().items.reduce((total, item) => total + item.estimatedPrice, 0)
        },

        getItemsByTailor: (tailorId) => {
          return get().items.filter((item) => item.tailorId === tailorId)
        },
      })),
      {
        name: 'cart-storage',
      }
    ),
    { name: 'cart-store' }
  )
)

// Usage in components
function AddToCartButton({ tailor, garmentData }: { 
  tailor: Tailor 
  garmentData: GarmentData 
}) {
  const addItem = useCartStore((state) => state.addItem)
  
  const handleAddToCart = () => {
    addItem({
      tailorId: tailor.id,
      tailorName: tailor.name,
      garmentType: garmentData.type,
      measurements: garmentData.measurements,
      customizations: garmentData.customizations,
      estimatedPrice: garmentData.estimatedPrice,
      deadline: garmentData.deadline,
      instructions: garmentData.instructions,
    })
    
    toast.success('Added to cart!')
  }
  
  return (
    <button onClick={handleAddToCart} className="bg-kente-gold text-white px-4 py-2 rounded">
      Add to Cart
    </button>
  )
}

function CartSummary() {
  const { items, getTotalItems, getTotalPrice, removeItem } = useCartStore()
  
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="font-semibold mb-4">Cart ({getTotalItems()} items)</h3>
      
      {items.map((item) => (
        <div key={item.id} className="flex justify-between items-center py-2">
          <div>
            <p className="font-medium">{item.garmentType}</p>
            <p className="text-sm text-gray-600">by {item.tailorName}</p>
          </div>
          <div className="flex items-center space-x-2">
            <span>₵{item.estimatedPrice}</span>
            <button
              onClick={() => removeItem(item.id)}
              className="text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      
      <div className="border-t pt-2 mt-2">
        <div className="flex justify-between font-semibold">
          <span>Total: ₵{getTotalPrice()}</span>
        </div>
      </div>
    </div>
  )
}
```

### Notifications Store

```typescript
// stores/notifications.store.ts
import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: number
  read: boolean
  actionUrl?: string
  actionLabel?: string
}

interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  removeNotification: (notificationId: string) => void
  clearAll: () => void
}

export const useNotificationsStore = create<NotificationsState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        notifications: [],
        unreadCount: 0,

        addNotification: (notificationData) => {
          const notification: Notification = {
            ...notificationData,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            read: false,
          }

          set((state) => {
            state.notifications.unshift(notification) // Add to beginning
            state.unreadCount += 1
            
            // Keep only last 50 notifications
            if (state.notifications.length > 50) {
              state.notifications = state.notifications.slice(0, 50)
            }
          })
        },

        markAsRead: (notificationId) => {
          set((state) => {
            const notification = state.notifications.find((n) => n.id === notificationId)
            if (notification && !notification.read) {
              notification.read = true
              state.unreadCount = Math.max(0, state.unreadCount - 1)
            }
          })
        },

        markAllAsRead: () => {
          set((state) => {
            state.notifications.forEach((notification) => {
              notification.read = true
            })
            state.unreadCount = 0
          })
        },

        removeNotification: (notificationId) => {
          set((state) => {
            const notificationIndex = state.notifications.findIndex((n) => n.id === notificationId)
            if (notificationIndex !== -1) {
              const notification = state.notifications[notificationIndex]
              if (!notification.read) {
                state.unreadCount = Math.max(0, state.unreadCount - 1)
              }
              state.notifications.splice(notificationIndex, 1)
            }
          })
        },

        clearAll: () => {
          set((state) => {
            state.notifications = []
            state.unreadCount = 0
          })
        },
      }))
    ),
    { name: 'notifications-store' }
  )
)

// Subscribe to auth changes to clear notifications on logout
useNotificationsStore.subscribe(
  (state) => state.notifications,
  () => {
    // Could implement notification persistence here
  }
)

// Usage in components
function NotificationBell() {
  const { unreadCount, notifications, markAsRead } = useNotificationsStore()
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs px-1 min-w-[16px] h-4 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
        </div>
        
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No notifications
          </div>
        ) : (
          notifications.slice(0, 10).map((notification) => (
            <div
              key={notification.id}
              className={cn(
                "p-4 border-b cursor-pointer hover:bg-gray-50",
                !notification.read && "bg-blue-50"
              )}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-sm">{notification.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                  </p>
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
                )}
              </div>
            </div>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### App Settings Store

```typescript
// stores/settings.store.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  language: 'en' | 'tw' | 'ga' // English, Twi, Ga
  currency: 'GHS' | 'USD'
  region: string
  notifications: {
    orders: boolean
    messages: boolean
    promotions: boolean
    whatsapp: boolean
  }
  preferences: {
    showPricesInUSD: boolean
    autoTranslate: boolean
    offlineMode: boolean
  }
}

interface SettingsState extends AppSettings {
  // Actions
  updateTheme: (theme: AppSettings['theme']) => void
  updateLanguage: (language: AppSettings['language']) => void
  updateCurrency: (currency: AppSettings['currency']) => void
  updateRegion: (region: string) => void
  updateNotificationSetting: (key: keyof AppSettings['notifications'], value: boolean) => void
  updatePreference: (key: keyof AppSettings['preferences'], value: boolean) => void
  resetToDefaults: () => void
}

const defaultSettings: AppSettings = {
  theme: 'system',
  language: 'en',
  currency: 'GHS',
  region: 'Greater Accra',
  notifications: {
    orders: true,
    messages: true,
    promotions: false,
    whatsapp: true,
  },
  preferences: {
    showPricesInUSD: false,
    autoTranslate: false,
    offlineMode: false,
  },
}

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      immer((set) => ({
        ...defaultSettings,

        updateTheme: (theme) => {
          set((state) => {
            state.theme = theme
          })
        },

        updateLanguage: (language) => {
          set((state) => {
            state.language = language
          })
        },

        updateCurrency: (currency) => {
          set((state) => {
            state.currency = currency
          })
        },

        updateRegion: (region) => {
          set((state) => {
            state.region = region
          })
        },

        updateNotificationSetting: (key, value) => {
          set((state) => {
            state.notifications[key] = value
          })
        },

        updatePreference: (key, value) => {
          set((state) => {
            state.preferences[key] = value
          })
        },

        resetToDefaults: () => {
          set((state) => {
            Object.assign(state, defaultSettings)
          })
        },
      })),
      {
        name: 'app-settings',
      }
    ),
    { name: 'settings-store' }
  )
)

// Usage in settings page
function SettingsPage() {
  const {
    theme,
    language,
    currency,
    notifications,
    updateTheme,
    updateLanguage,
    updateCurrency,
    updateNotificationSetting,
  } = useSettingsStore()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Appearance</h3>
        <RadioGroup value={theme} onValueChange={updateTheme}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="light" id="light" />
            <Label htmlFor="light">Light</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="dark" id="dark" />
            <Label htmlFor="dark">Dark</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="system" id="system" />
            <Label htmlFor="system">System</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <h3 className="text-lg font-medium">Language</h3>
        <Select value={language} onValueChange={updateLanguage}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="tw">Twi</SelectItem>
            <SelectItem value="ga">Ga</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <h3 className="text-lg font-medium">Notifications</h3>
        <div className="space-y-2">
          {Object.entries(notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={key} className="capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </Label>
              <Switch
                id={key}
                checked={value}
                onCheckedChange={(checked) =>
                  updateNotificationSetting(key as keyof AppSettings['notifications'], checked)
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

### Offline Store for Ghana Market

```typescript
// stores/offline.store.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface OfflineAction {
  id: string
  type: 'CREATE_ORDER' | 'UPDATE_PROFILE' | 'SEND_MESSAGE'
  payload: any
  timestamp: number
  retryCount: number
}

interface OfflineState {
  isOnline: boolean
  pendingActions: OfflineAction[]
  
  // Actions
  setOnlineStatus: (isOnline: boolean) => void
  addPendingAction: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>) => void
  removePendingAction: (actionId: string) => void
  processPendingActions: () => Promise<void>
  incrementRetryCount: (actionId: string) => void
}

export const useOfflineStore = create<OfflineState>()(
  devtools(
    persist(
      immer((set, get) => ({
        isOnline: navigator.onLine,
        pendingActions: [],

        setOnlineStatus: (isOnline) => {
          set((state) => {
            state.isOnline = isOnline
          })
          
          // Process pending actions when coming back online
          if (isOnline) {
            setTimeout(() => get().processPendingActions(), 1000)
          }
        },

        addPendingAction: (actionData) => {
          const action: OfflineAction = {
            ...actionData,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            retryCount: 0,
          }

          set((state) => {
            state.pendingActions.push(action)
          })
        },

        removePendingAction: (actionId) => {
          set((state) => {
            state.pendingActions = state.pendingActions.filter((action) => action.id !== actionId)
          })
        },

        incrementRetryCount: (actionId) => {
          set((state) => {
            const action = state.pendingActions.find((a) => a.id === actionId)
            if (action) {
              action.retryCount += 1
            }
          })
        },

        processPendingActions: async () => {
          const { pendingActions, removePendingAction, incrementRetryCount } = get()
          
          for (const action of pendingActions) {
            try {
              // Process action based on type
              switch (action.type) {
                case 'CREATE_ORDER':
                  await OrdersService.createOrder(action.payload)
                  break
                case 'UPDATE_PROFILE':
                  await AuthService.updateProfile(action.payload)
                  break
                case 'SEND_MESSAGE':
                  await MessagesService.sendMessage(action.payload)
                  break
              }
              
              removePendingAction(action.id)
              
              // Show success notification
              useNotificationsStore.getState().addNotification({
                type: 'success',
                title: 'Sync Complete',
                message: `${action.type.replace('_', ' ').toLowerCase()} completed successfully`,
              })
              
            } catch (error) {
              incrementRetryCount(action.id)
              
              // Remove action if retried too many times
              if (action.retryCount >= 3) {
                removePendingAction(action.id)
                
                useNotificationsStore.getState().addNotification({
                  type: 'error',
                  title: 'Sync Failed',
                  message: `Failed to complete ${action.type.replace('_', ' ').toLowerCase()}`,
                })
              }
            }
          }
        },
      })),
      {
        name: 'offline-storage',
      }
    ),
    { name: 'offline-store' }
  )
)

// Set up online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useOfflineStore.getState().setOnlineStatus(true)
  })
  
  window.addEventListener('offline', () => {
    useOfflineStore.getState().setOnlineStatus(false)
  })
}

// Usage in components
function OfflineIndicator() {
  const { isOnline, pendingActions } = useOfflineStore()
  
  if (isOnline && pendingActions.length === 0) return null
  
  return (
    <div className={cn(
      "fixed bottom-4 right-4 p-3 rounded-lg shadow-lg",
      isOnline ? "bg-yellow-500" : "bg-red-500",
      "text-white"
    )}>
      {!isOnline ? (
        <div className="flex items-center space-x-2">
          <WifiOff className="h-4 w-4" />
          <span>You're offline</span>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Syncing {pendingActions.length} actions...</span>
        </div>
      )}
    </div>
  )
}
```

## Store Composition and Selectors

```typescript
// hooks/useAuth.ts - Custom hook that combines multiple stores
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useOfflineStore } from '@/stores/offline.store'

export function useAuth() {
  const auth = useAuthStore()
  const addNotification = useNotificationsStore((state) => state.addNotification)
  const { isOnline, addPendingAction } = useOfflineStore()

  const loginWithOfflineSupport = async (email: string, password: string) => {
    if (!isOnline) {
      addNotification({
        type: 'warning',
        title: 'Offline',
        message: 'Please connect to the internet to sign in',
      })
      return
    }

    try {
      await auth.login(email, password)
      addNotification({
        type: 'success',
        title: 'Welcome back!',
        message: `Signed in as ${auth.user?.name}`,
      })
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Sign in failed',
        message: error.message,
      })
    }
  }

  return {
    ...auth,
    loginWithOfflineSupport,
  }
}

// Selectors for performance optimization
export const useCartTotal = () => useCartStore((state) => state.getTotalPrice())
export const useUnreadCount = () => useNotificationsStore((state) => state.unreadCount)
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)
```

## Best Practices for Sew4Mi

1. **Store Separation**: Keep stores focused on specific domains (auth, cart, notifications)
2. **TypeScript**: Use strict typing for better developer experience and runtime safety
3. **Persistence**: Persist important state (auth, cart, settings) across sessions
4. **Performance**: Use selectors to prevent unnecessary re-renders
5. **Offline Support**: Queue actions when offline and sync when connection returns
6. **DevTools**: Use Redux DevTools for debugging state changes
7. **Immer**: Use Immer middleware for immutable updates with mutable syntax
8. **Ghana Context**: Handle offline scenarios common in Ghana's mobile network environment

This setup provides robust state management for Sew4Mi with excellent developer experience and performance optimizations for the Ghana market's connectivity challenges.