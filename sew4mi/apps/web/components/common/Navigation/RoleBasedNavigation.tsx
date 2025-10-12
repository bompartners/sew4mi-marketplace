'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  USER_ROLES, 
  ROLE_LABELS,
  hasPermission,
  PERMISSIONS 
} from '@sew4mi/shared';
import {
  Home,
  Package,
  Users,
  Calendar,
  DollarSign,
  Settings,
  User,
  LogOut,
  ChevronDown,
  Shield,
  BarChart3,
  FileText,
  Scissors,
  ShoppingBag,
  Search,
  Ruler,
  UserPlus,
  Heart,
  Award
} from 'lucide-react';

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  badge?: string | number;
}

interface RoleBasedNavigationProps {
  className?: string;
  isMobile?: boolean;
  onNavigate?: () => void; // For mobile menu close
}

export function RoleBasedNavigation({ 
  className = '', 
  isMobile = false, 
  onNavigate 
}: RoleBasedNavigationProps) {
  const { user, userRole, signOut } = useAuth();
  const pathname = usePathname();

  const getNavigationItems = (): NavigationItem[] => {
    if (!userRole) return [];

    switch (userRole) {
      case USER_ROLES.CUSTOMER:
        return [
          { 
            href: '/dashboard', 
            label: 'Dashboard', 
            icon: Home 
          },
          { 
            href: '/orders', 
            label: 'My Orders', 
            icon: Package,
            permission: PERMISSIONS.VIEW_OWN_ORDERS
          },
          { 
            href: '/orders/new', 
            label: 'New Order', 
            icon: ShoppingBag,
            permission: PERMISSIONS.PLACE_ORDERS
          },
          { 
            href: '/tailors', 
            label: 'Browse Tailors', 
            icon: Search,
            permission: PERMISSIONS.BROWSE_TAILORS
          },
          { 
            href: '/measurements', 
            label: 'Measurements', 
            icon: Ruler,
            permission: PERMISSIONS.CREATE_MEASUREMENTS
          },
          {
            href: '/family',
            label: 'Family Profiles',
            icon: UserPlus,
            permission: PERMISSIONS.MANAGE_FAMILY_PROFILES
          },
          {
            href: '/favorites',
            label: 'Favorites',
            icon: Heart
          },
          {
            href: '/loyalty',
            label: 'Loyalty Rewards',
            icon: Award
          }
        ];

      case USER_ROLES.TAILOR:
        return [
          { 
            href: '/dashboard', 
            label: 'Dashboard', 
            icon: Home 
          },
          { 
            href: '/orders', 
            label: 'Orders', 
            icon: Package,
            permission: PERMISSIONS.VIEW_ASSIGNED_ORDERS
          },
          { 
            href: '/portfolio', 
            label: 'Portfolio', 
            icon: Scissors,
            permission: PERMISSIONS.MANAGE_PORTFOLIO
          },
          { 
            href: '/calendar', 
            label: 'Calendar', 
            icon: Calendar,
            permission: PERMISSIONS.MANAGE_AVAILABILITY
          },
          { 
            href: '/earnings', 
            label: 'Earnings', 
            icon: DollarSign,
            permission: PERMISSIONS.VIEW_EARNINGS
          }
        ];

      case USER_ROLES.ADMIN:
        return [
          { 
            href: '/admin/dashboard', 
            label: 'Admin Dashboard', 
            icon: Shield 
          },
          { 
            href: '/admin/users', 
            label: 'Manage Users', 
            icon: Users,
            permission: PERMISSIONS.VIEW_ALL_USERS
          },
          { 
            href: '/admin/orders', 
            label: 'All Orders', 
            icon: Package,
            permission: PERMISSIONS.VIEW_ALL_ORDERS
          },
          { 
            href: '/admin/disputes', 
            label: 'Disputes', 
            icon: FileText,
            permission: PERMISSIONS.MANAGE_DISPUTES
          },
          { 
            href: '/admin/analytics', 
            label: 'Analytics', 
            icon: BarChart3,
            permission: PERMISSIONS.VIEW_ANALYTICS
          },
          { 
            href: '/admin/audit-logs', 
            label: 'Audit Logs', 
            icon: FileText,
            permission: PERMISSIONS.VIEW_AUDIT_LOGS
          }
        ];

      default:
        return [
          { 
            href: '/dashboard', 
            label: 'Dashboard', 
            icon: Home 
          }
        ];
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      if (onNavigate) onNavigate();
      // Redirect to landing/default page after sign out
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const handleNavigation = () => {
    if (onNavigate) onNavigate();
  };

  const navigationItems = getNavigationItems().filter(item => {
    // Filter out items the user doesn't have permission for
    if (item.permission && userRole) {
      return hasPermission(userRole, item.permission as any);
    }
    return true;
  });

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/admin/dashboard';
    }
    return pathname.startsWith(href);
  };

  if (isMobile) {
    return (
      <nav className={`space-y-1 ${className}`}>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavigation}
              className={`
                flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors
                ${active 
                  ? 'bg-[#CE1126] text-white' 
                  : 'text-gray-700 hover:text-[#CE1126] hover:bg-gray-50'
                }
              `}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.label}
              {item.badge && (
                <span className="ml-auto bg-[#FFD700] text-[#8B4513] text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        <div className="pt-4 border-t border-gray-200">
          <Link
            href="/profile"
            onClick={handleNavigation}
            className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:text-[#CE1126] hover:bg-gray-50 rounded-md transition-colors"
          >
            <User className="mr-3 h-5 w-5" />
            Profile
          </Link>
          
          <Link
            href="/settings"
            onClick={handleNavigation}
            className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:text-[#CE1126] hover:bg-gray-50 rounded-md transition-colors"
          >
            <Settings className="mr-3 h-5 w-5" />
            Settings
          </Link>
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </button>
        </div>
      </nav>
    );
  }

  // Desktop navigation
  return (
    <nav className={`flex items-center space-x-1 ${className}`}>
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              relative flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
              ${active 
                ? 'bg-[#CE1126] text-white' 
                : 'text-gray-700 hover:text-[#CE1126] hover:bg-gray-50'
              }
            `}
          >
            <Icon className="mr-2 h-4 w-4" />
            {item.label}
            {item.badge && (
              <span className="ml-2 bg-[#FFD700] text-[#8B4513] text-xs px-1.5 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}

      {/* User Menu */}
      <div className="ml-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#CE1126] text-white rounded-full flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
              <span className="hidden md:block text-sm font-medium">
                {user?.email?.split('@')[0] || 'User'}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">
                  {user?.user_metadata?.full_name || user?.email || 'User'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userRole && ROLE_LABELS[userRole]} • {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}