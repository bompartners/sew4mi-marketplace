# Radix UI Documentation

Radix UI is a low-level UI primitives library with a focus on accessibility, customization, and developer experience. It's used in Sew4Mi to build accessible and high-quality design system components.

## Core Concepts for Sew4Mi

### Accessibility-First
- **ARIA compliant**: All components follow WAI-ARIA standards
- **Keyboard navigation**: Full keyboard support out of the box
- **Screen reader support**: Proper semantic markup and labels
- **Focus management**: Intelligent focus handling and restoration

### Unstyled Components
- **Headless UI**: Components provide behavior without styling
- **CSS-in-JS friendly**: Works with styled-components, emotion, etc.
- **Tailwind ready**: Easy to style with utility classes
- **Custom theming**: Full control over visual appearance

## Key Integration Patterns

### Dialog/Modal Components

```typescript
// components/ui/dialog.tsx
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const DialogRoot = Dialog.Root
const DialogTrigger = Dialog.Trigger
const DialogPortal = Dialog.Portal

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof Dialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(({ className, ...props }, ref) => (
  <Dialog.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))

const DialogContent = React.forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  React.ComponentPropsWithoutRef<typeof Dialog.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <Dialog.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </Dialog.Close>
    </Dialog.Content>
  </DialogPortal>
))

// Usage in Sew4Mi application
function TailorContactDialog({ tailor }: { tailor: Tailor }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="bg-kente-gold text-white px-4 py-2 rounded">
          Contact {tailor.name}
        </button>
      </Dialog.Trigger>
      <DialogContent className="sm:max-w-[425px]">
        <Dialog.Title className="text-lg font-semibold">
          Contact {tailor.name}
        </Dialog.Title>
        <Dialog.Description className="text-sm text-muted-foreground">
          Send a message to {tailor.businessName} via WhatsApp or schedule a consultation.
        </Dialog.Description>
        
        <div className="grid gap-4 py-4">
          <WhatsAppContactForm tailorId={tailor.id} />
        </div>
      </DialogContent>
    </Dialog.Root>
  )
}
```

### Dropdown Menu for Navigation

```typescript
// components/ui/dropdown-menu.tsx
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronRight, Circle } from 'lucide-react'

const DropdownMenuRoot = DropdownMenu.Root
const DropdownMenuTrigger = DropdownMenu.Trigger
const DropdownMenuGroup = DropdownMenu.Group
const DropdownMenuPortal = DropdownMenu.Portal
const DropdownMenuSub = DropdownMenu.Sub
const DropdownMenuRadioGroup = DropdownMenu.RadioGroup

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenu.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenu.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </DropdownMenu.Portal>
))

// User profile dropdown
function UserProfileDropdown({ user }: { user: User }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center space-x-2 rounded-full p-2 hover:bg-gray-100">
          <img
            src={user.profileImage || '/default-avatar.png'}
            alt={user.name}
            className="h-8 w-8 rounded-full"
          />
          <span className="hidden md:block">{user.name}</span>
        </button>
      </DropdownMenu.Trigger>
      
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenu.Label className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenu.Label>
        
        <DropdownMenu.Separator />
        
        <DropdownMenu.Group>
          <DropdownMenu.Item>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item>
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Orders</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenu.Item>
        </DropdownMenu.Group>
        
        <DropdownMenu.Separator />
        
        <DropdownMenu.Item onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenu.Item>
      </DropdownMenuContent>
    </DropdownMenu.Root>
  )
}
```

### Form Components with Validation

```typescript
// components/ui/form.tsx using React Hook Form + Radix
import * as Form from '@radix-ui/react-form'
import * as Label from '@radix-ui/react-label'
import { useController, Control } from 'react-hook-form'

interface FormFieldProps {
  name: string
  control: Control<any>
  label: string
  placeholder?: string
  required?: boolean
  type?: 'text' | 'email' | 'password' | 'tel'
}

function FormField({ name, control, label, placeholder, required, type = 'text' }: FormFieldProps) {
  const {
    field,
    fieldState: { invalid, error },
  } = useController({
    name,
    control,
    rules: { required: required ? `${label} is required` : false },
  })

  return (
    <Form.Field className="grid w-full gap-1.5" name={name}>
      <Label.Root className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label.Root>
      
      <Form.Control asChild>
        <input
          {...field}
          type={type}
          placeholder={placeholder}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            invalid && "border-red-500"
          )}
        />
      </Form.Control>
      
      <Form.Message className="text-sm font-medium text-destructive">
        {error?.message}
      </Form.Message>
    </Form.Field>
  )
}

// Registration form for Sew4Mi
function RegistrationForm() {
  const { control, handleSubmit } = useForm<RegistrationData>()

  return (
    <Form.Root className="w-full space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <FormField
        name="fullName"
        control={control}
        label="Full Name"
        placeholder="Enter your full name"
        required
      />
      
      <FormField
        name="email"
        control={control}
        label="Email"
        placeholder="Enter your email"
        type="email"
        required
      />
      
      <FormField
        name="phone"
        control={control}
        label="Phone Number"
        placeholder="e.g., 0245123456"
        type="tel"
        required
      />
      
      <Form.Submit asChild>
        <button className="w-full bg-kente-gold text-white py-2 px-4 rounded-md hover:bg-opacity-90">
          Create Account
        </button>
      </Form.Submit>
    </Form.Root>
  )
}
```

### Radio Group for Order Options

```typescript
// components/ui/radio-group.tsx
import * as RadioGroup from '@radix-ui/react-radio-group'
import { Circle } from 'lucide-react'

const RadioGroupRoot = React.forwardRef<
  React.ElementRef<typeof RadioGroup.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroup.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroup.Root
      className={cn("grid gap-2", className)}
      {...props}
      ref={ref}
    />
  )
})

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroup.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroup.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroup.Item
      ref={ref}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioGroup.Indicator className="flex items-center justify-center">
        <Circle className="h-2.5 w-2.5 fill-current text-current" />
      </RadioGroup.Indicator>
    </RadioGroup.Item>
  )
})

// Garment selection for orders
function GarmentTypeSelector({ value, onValueChange }: { 
  value: string 
  onValueChange: (value: string) => void 
}) {
  const garmentTypes = [
    { id: 'traditional-dress', label: 'Traditional Dress', description: 'Kente, Kaba and Slit' },
    { id: 'modern-dress', label: 'Modern Dress', description: 'Contemporary African fashion' },
    { id: 'suit', label: 'Suit', description: 'Formal wear and business attire' },
    { id: 'casual', label: 'Casual Wear', description: 'Everyday clothing' },
  ]

  return (
    <RadioGroup.Root value={value} onValueChange={onValueChange} className="grid gap-4">
      {garmentTypes.map((type) => (
        <div key={type.id} className="flex items-center space-x-2">
          <RadioGroup.Item value={type.id} id={type.id} />
          <Label htmlFor={type.id} className="flex-1 cursor-pointer">
            <div className="font-medium">{type.label}</div>
            <div className="text-sm text-muted-foreground">{type.description}</div>
          </Label>
        </div>
      ))}
    </RadioGroup.Root>
  )
}
```

### Toast Notifications

```typescript
// components/ui/toast.tsx
import * as Toast from '@radix-ui/react-toast'
import { X } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive: "destructive border-destructive bg-destructive text-destructive-foreground",
        success: "border-green-500 bg-green-50 text-green-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// Toast provider for the application
function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider swipeDirection="right">
      {children}
      <Toast.Viewport className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]" />
    </Toast.Provider>
  )
}

// Custom toast hook for Sew4Mi
function useToast() {
  const [toasts, setToasts] = React.useState<ToastProps[]>([])

  const toast = React.useCallback(({ ...props }: ToastProps) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((toasts) => [...toasts, { ...props, id }])
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts((toasts) => toasts.filter((toast) => toast.id !== id))
    }, 5000)

    return {
      id,
      dismiss: () => setToasts((toasts) => toasts.filter((toast) => toast.id !== id)),
    }
  }, [])

  return {
    toast,
    toasts,
    dismiss: (toastId: string) =>
      setToasts((toasts) => toasts.filter((toast) => toast.id !== toastId)),
  }
}

// Usage in order placement
function OrderSuccessToast() {
  const { toast } = useToast()

  const showOrderSuccess = () => {
    toast({
      title: "Order Placed Successfully!",
      description: "Your order has been sent to the tailor. You will receive a WhatsApp confirmation shortly.",
      variant: "success",
    })
  }

  return <button onClick={showOrderSuccess}>Place Order</button>
}
```

### Accessible Data Tables

```typescript
// components/ui/table.tsx
import * as React from 'react'

// Using semantic HTML with Radix styling patterns
const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))

// Orders table for Sew4Mi
function OrdersTable({ orders }: { orders: Order[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Order ID</TableHead>
          <TableHead>Tailor</TableHead>
          <TableHead>Garment Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-medium">#{order.id.slice(-8)}</TableCell>
            <TableCell>{order.tailor.name}</TableCell>
            <TableCell>{order.garmentType}</TableCell>
            <TableCell>
              <Badge variant={getStatusVariant(order.status)}>
                {order.status}
              </Badge>
            </TableCell>
            <TableCell>₵{order.totalAmount}</TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View Details</DropdownMenuItem>
                  <DropdownMenuItem>Contact Tailor</DropdownMenuItem>
                  <DropdownMenuItem>Download Receipt</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

## Ghana Market Optimizations

### Mobile-First Components

```typescript
// Mobile-optimized sheet component
import * as Dialog from '@radix-ui/react-dialog'

const Sheet = ({ children, ...props }: React.ComponentProps<typeof Dialog.Root>) => (
  <Dialog.Root {...props}>
    {children}
  </Dialog.Root>
)

const SheetContent = React.forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  React.ComponentPropsWithoutRef<typeof Dialog.Content> & {
    side?: 'top' | 'bottom' | 'left' | 'right'
  }
>(({ side = 'right', className, children, ...props }, ref) => (
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
    <Dialog.Content
      ref={ref}
      className={cn(
        "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
        {
          'inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm': side === 'left',
          'inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm': side === 'right',
          'inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom': side === 'bottom',
          'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top': side === 'top',
        },
        className
      )}
      {...props}
    >
      {children}
    </Dialog.Content>
  </Dialog.Portal>
))

// Mobile navigation sheet
function MobileNavigation() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <nav className="flex flex-col space-y-4">
          <Link href="/tailors" className="flex items-center space-x-2 p-2">
            <Users className="h-4 w-4" />
            <span>Find Tailors</span>
          </Link>
          <Link href="/orders" className="flex items-center space-x-2 p-2">
            <Package className="h-4 w-4" />
            <span>My Orders</span>
          </Link>
          <Link href="/measurements" className="flex items-center space-x-2 p-2">
            <Ruler className="h-4 w-4" />
            <span>My Measurements</span>
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
```

### Currency and Location Selectors

```typescript
// Ghana-specific select components
import * as Select from '@radix-ui/react-select'
import { ChevronDown } from 'lucide-react'

function LocationSelector({ value, onValueChange }: {
  value: string
  onValueChange: (value: string) => void
}) {
  const ghanaRegions = [
    'Greater Accra',
    'Ashanti Region',
    'Northern Region',
    'Central Region',
    'Western Region',
    'Eastern Region',
    'Volta Region',
    'Upper East Region',
    'Upper West Region',
    'Brong-Ahafo Region',
  ]

  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
        <Select.Value placeholder="Select your region" />
        <Select.Icon asChild>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2">
          <Select.Viewport className="p-1">
            {ghanaRegions.map((region) => (
              <Select.Item
                key={region}
                value={region}
                className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <Select.ItemText>{region}</Select.ItemText>
                <Select.ItemIndicator className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  <Check className="h-4 w-4" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
```

## Best Practices for Sew4Mi

1. **Accessibility**: Always use Radix components for complex interactions
2. **Styling**: Combine with Tailwind CSS for consistent design system
3. **Mobile-First**: Use Sheet components for mobile navigation and forms
4. **Performance**: Import only the components you need to reduce bundle size
5. **Customization**: Override default styles while maintaining accessibility
6. **Testing**: Test keyboard navigation and screen reader compatibility
7. **Ghana Context**: Adapt components for local preferences and mobile usage patterns

This setup provides a robust, accessible foundation for all interactive components in Sew4Mi while maintaining the flexibility to customize for the Ghana market's specific needs.