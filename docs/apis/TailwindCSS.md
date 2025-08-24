# Tailwind CSS Documentation

Tailwind CSS is a utility-first CSS framework for rapidly building custom user interfaces. It's used in Sew4Mi to create responsive, accessible, and visually appealing designs with a Ghana-inspired theme.

## Core Concepts for Sew4Mi

### Utility-First Approach
- **Atomic classes**: Single-purpose utility classes for styling
- **Responsive design**: Built-in responsive modifiers for all screen sizes
- **Component composition**: Build complex components from simple utilities
- **Design consistency**: Predefined design tokens ensure visual consistency

### Customization
- **Custom colors**: Ghana-inspired color palette (Kente and Adinkra colors)
- **Typography**: Custom font families and sizing scales
- **Spacing**: Consistent spacing system throughout the application
- **Components**: Reusable component styles built with utilities

## Key Integration Patterns

### Ghana-Inspired Theme Configuration

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Ghana/Kente inspired colors
        kente: {
          gold: '#FFD700',
          red: '#CE1126', 
          green: '#006B3F',
          black: '#000000',
        },
        adinkra: {
          brown: '#8B4513',
          cream: '#FFFDD0',
          gold: '#DAA520',
        },
        // App specific colors
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Poppins', 'sans-serif'],
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'pulse-ring': {
          '0%': {
            transform: 'scale(0.33)',
          },
          '40%, 50%': {
            opacity: '1',
          },
          '100%': {
            opacity: '0',
            transform: 'scale(1.03)',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'pulse-ring': 'pulse-ring 1.25s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
      },
      screens: {
        'xs': '475px',
      },
      backgroundImage: {
        'kente-pattern': "url('/images/kente-pattern.svg')",
        'adinkra-pattern': "url('/images/adinkra-pattern.svg')",
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
```

### Component Styling Patterns

```typescript
// components/ui/TailorCard.tsx
import { cn } from '@/lib/utils'

interface TailorCardProps {
  tailor: Tailor
  featured?: boolean
  onClick?: () => void
}

function TailorCard({ tailor, featured = false, onClick }: TailorCardProps) {
  return (
    <div
      className={cn(
        // Base styles
        "bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 cursor-pointer group",
        // Hover states
        "hover:shadow-lg hover:-translate-y-1",
        // Featured variant
        featured && "ring-2 ring-kente-gold shadow-xl",
        // Interactive states
        "focus:outline-none focus:ring-2 focus:ring-kente-gold focus:ring-offset-2"
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      {/* Image container */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={tailor.profileImage || '/images/default-tailor.jpg'}
          alt={tailor.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Verification badge */}
        {tailor.isVerified && (
          <div className="absolute top-2 right-2 bg-kente-green text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>Verified</span>
          </div>
        )}
        
        {/* Rating overlay */}
        <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded-md text-sm flex items-center space-x-1">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          <span>{tailor.rating}</span>
          <span className="text-gray-300">({tailor.reviewCount})</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-heading font-semibold text-lg text-gray-900 group-hover:text-kente-gold transition-colors">
              {tailor.name}
            </h3>
            <p className="text-sm text-gray-600">{tailor.businessName}</p>
          </div>
          
          {featured && (
            <div className="bg-gradient-to-r from-kente-gold to-adinkra-gold text-white px-2 py-1 rounded-full text-xs font-bold">
              FEATURED
            </div>
          )}
        </div>
        
        {/* Location */}
        <div className="flex items-center text-sm text-gray-500 mb-3">
          <MapPin className="w-4 h-4 mr-1" />
          {tailor.location}
        </div>
        
        {/* Specialties */}
        <div className="flex flex-wrap gap-1 mb-4">
          {tailor.specialties.slice(0, 3).map((specialty, index) => (
            <span
              key={index}
              className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs hover:bg-kente-gold hover:text-white transition-colors"
            >
              {specialty}
            </span>
          ))}
          {tailor.specialties.length > 3 && (
            <span className="text-gray-500 text-xs">
              +{tailor.specialties.length - 3} more
            </span>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex space-x-2">
          <button className="flex-1 bg-kente-gold text-white py-2 px-4 rounded-md hover:bg-opacity-90 transition-colors font-medium">
            View Profile
          </button>
          <button className="bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors">
            <MessageCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Responsive Layout Components

```typescript
// components/layout/Navigation.tsx
function Navigation() {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-kente-gold rounded-full flex items-center justify-center">
                <Scissors className="w-5 h-5 text-white" />
              </div>
              <span className="font-heading font-bold text-xl text-gray-900">
                Sew4Mi
              </span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/tailors"
              className="text-gray-600 hover:text-kente-gold transition-colors font-medium"
            >
              Find Tailors
            </Link>
            <Link
              href="/how-it-works"
              className="text-gray-600 hover:text-kente-gold transition-colors font-medium"
            >
              How It Works
            </Link>
            <Link
              href="/apply-tailor"
              className="text-gray-600 hover:text-kente-gold transition-colors font-medium"
            >
              Become a Tailor
            </Link>
          </div>
          
          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            <button className="relative p-2 text-gray-600 hover:text-kente-gold transition-colors">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-kente-red text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                3
              </span>
            </button>
            
            {/* Mobile menu button */}
            <button className="md:hidden p-2 text-gray-600 hover:text-kente-gold transition-colors">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

// components/layout/Hero.tsx
function Hero() {
  return (
    <section className="relative bg-gradient-to-br from-kente-gold via-adinkra-gold to-kente-gold overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-kente-pattern opacity-10"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-white leading-tight">
              Connect with
              <span className="block bg-gradient-to-r from-adinkra-cream to-white bg-clip-text text-transparent">
                Ghana's Best Tailors
              </span>
            </h1>
            
            <p className="mt-6 text-lg sm:text-xl text-white/90 max-w-lg mx-auto lg:mx-0">
              Get custom-made clothing from skilled Ghanaian tailors. 
              Order online, pay securely, and get delivered to your doorstep.
            </p>
            
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button className="bg-white text-kente-gold px-8 py-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-lg">
                Find Tailors Near You
              </button>
              <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-kente-gold transition-colors">
                Become a Tailor
              </button>
            </div>
            
            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-4 text-center lg:text-left">
              <div>
                <div className="font-bold text-2xl text-white">500+</div>
                <div className="text-white/80 text-sm">Verified Tailors</div>
              </div>
              <div>
                <div className="font-bold text-2xl text-white">10k+</div>
                <div className="text-white/80 text-sm">Happy Customers</div>
              </div>
              <div>
                <div className="font-bold text-2xl text-white">50k+</div>
                <div className="text-white/80 text-sm">Orders Completed</div>
              </div>
            </div>
          </div>
          
          {/* Image */}
          <div className="relative">
            <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="/images/ghana-tailor-hero.jpg"
                alt="Ghanaian tailor at work"
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 bg-white p-4 rounded-lg shadow-lg animate-pulse-ring">
              <Star className="w-6 h-6 text-kente-gold" />
            </div>
            <div className="absolute -bottom-4 -left-4 bg-kente-green text-white p-4 rounded-lg shadow-lg">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

### Form Styling

```typescript
// components/forms/OrderForm.tsx
function OrderForm() {
  return (
    <form className="space-y-6 bg-white p-6 rounded-xl shadow-lg">
      <div className="text-center mb-8">
        <h2 className="font-heading font-bold text-2xl text-gray-900 mb-2">
          Place Your Order
        </h2>
        <p className="text-gray-600">
          Tell us about your custom garment requirements
        </p>
      </div>
      
      {/* Garment Type Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Garment Type *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {garmentTypes.map((type) => (
            <div
              key={type.id}
              className="relative flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-kente-gold hover:bg-kente-gold/5 transition-all group"
            >
              <input
                type="radio"
                name="garmentType"
                value={type.id}
                className="sr-only"
              />
              <div className="flex-1">
                <div className="flex items-center">
                  <type.icon className="w-5 h-5 text-kente-gold mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{type.name}</p>
                    <p className="text-sm text-gray-500">{type.description}</p>
                  </div>
                </div>
              </div>
              <div className="w-4 h-4 border border-gray-300 rounded-full group-hover:border-kente-gold transition-colors"></div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Measurements */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Measurements (inches)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chest
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-kente-gold focus:border-kente-gold transition-colors"
              placeholder="36"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Waist
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-kente-gold focus:border-kente-gold transition-colors"
              placeholder="32"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hip
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-kente-gold focus:border-kente-gold transition-colors"
              placeholder="38"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Length
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-kente-gold focus:border-kente-gold transition-colors"
              placeholder="45"
            />
          </div>
        </div>
      </div>
      
      {/* Special Instructions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Special Instructions
        </label>
        <textarea
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-kente-gold focus:border-kente-gold transition-colors resize-none"
          placeholder="Please use Kente cloth with gold accents..."
        />
      </div>
      
      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reference Images
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-kente-gold transition-colors">
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            Drag and drop images, or <span className="text-kente-gold font-medium">browse</span>
          </p>
        </div>
      </div>
      
      {/* Submit Button */}
      <button
        type="submit"
        className="w-full bg-gradient-to-r from-kente-gold to-adinkra-gold text-white py-4 px-6 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
      >
        Place Order - ₵250.00
      </button>
    </form>
  )
}
```

### Mobile-Optimized Components

```typescript
// components/mobile/BottomTabNavigation.tsx
function BottomTabNavigation() {
  const pathname = usePathname()
  
  const tabs = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/tailors', icon: Users, label: 'Tailors' },
    { href: '/orders', icon: Package, label: 'Orders' },
    { href: '/messages', icon: MessageCircle, label: 'Messages' },
    { href: '/profile', icon: User, label: 'Profile' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50">
      <div className="grid grid-cols-5">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href
          const Icon = tab.icon
          
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1 text-xs transition-colors",
                isActive
                  ? "text-kente-gold bg-kente-gold/5"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon className={cn("w-5 h-5 mb-1", isActive && "text-kente-gold")} />
              <span className={cn("font-medium", isActive && "text-kente-gold")}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// components/mobile/SearchBar.tsx
function MobileSearchBar() {
  return (
    <div className="p-4 bg-white border-b border-gray-200">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search tailors, services..."
          className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-kente-gold focus:bg-white transition-all"
        />
      </div>
      
      {/* Quick filters */}
      <div className="flex space-x-2 mt-3 overflow-x-auto pb-2">
        {['Nearby', 'Traditional', 'Modern', 'Verified', 'Fast Delivery'].map((filter) => (
          <button
            key={filter}
            className="flex-shrink-0 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-kente-gold hover:text-white transition-colors whitespace-nowrap"
          >
            {filter}
          </button>
        ))}
      </div>
    </div>
  )
}
```

### Custom Utility Classes

```css
/* globals.css - Additional custom utilities */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 46 100% 50%; /* Kente Gold */
    --primary-foreground: 222.2 84% 4.9%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 46 100% 50%; /* Kente Gold */
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 46 100% 50%;
    --primary-foreground: 222.2 84% 4.9%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 46 100% 50%;
  }
}

@layer components {
  /* Ghana-inspired gradients */
  .bg-kente-gradient {
    @apply bg-gradient-to-r from-kente-gold via-kente-red to-kente-green;
  }
  
  .bg-adinkra-gradient {
    @apply bg-gradient-to-br from-adinkra-brown to-adinkra-gold;
  }
  
  /* Custom button variants */
  .btn-kente {
    @apply bg-kente-gold text-white px-4 py-2 rounded-md font-medium hover:bg-opacity-90 transition-colors;
  }
  
  .btn-kente-outline {
    @apply border-2 border-kente-gold text-kente-gold px-4 py-2 rounded-md font-medium hover:bg-kente-gold hover:text-white transition-colors;
  }
  
  /* Card variants */
  .card-ghana {
    @apply bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow;
  }
  
  .card-featured {
    @apply ring-2 ring-kente-gold shadow-xl;
  }
  
  /* Text utilities */
  .text-kente-gradient {
    @apply bg-gradient-to-r from-kente-gold to-kente-red bg-clip-text text-transparent;
  }
}

@layer utilities {
  /* Mobile-first utilities */
  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
  
  .safe-area-top {
    padding-top: env(safe-area-inset-top);
  }
  
  /* Ghana-specific spacing */
  .space-ghana {
    @apply space-y-6;
  }
  
  /* Accessibility utilities */
  .focus-ring-kente {
    @apply focus:outline-none focus:ring-2 focus:ring-kente-gold focus:ring-offset-2;
  }
}
```

## Best Practices for Sew4Mi

1. **Responsive Design**: Mobile-first approach for Ghana's mobile-heavy market
2. **Performance**: Use PurgeCSS to remove unused styles in production
3. **Accessibility**: Include focus states and proper contrast ratios
4. **Design System**: Maintain consistent spacing, colors, and typography
5. **Cultural Sensitivity**: Use Ghana-inspired colors and patterns appropriately
6. **Bundle Optimization**: Only include necessary Tailwind utilities
7. **Component Composition**: Build reusable components with utility classes
8. **Dark Mode**: Support both light and dark themes for user preference

This configuration provides a comprehensive design system for Sew4Mi that's both culturally relevant and technically optimized for the Ghana market.