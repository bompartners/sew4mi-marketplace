'use client';

/**
 * Component for Story 4.3: Loyalty Points Badge
 * Display in header/navigation
 */

import { Star, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useLoyalty } from '@/hooks/useLoyalty';
import { cn } from '@/lib/utils';

interface LoyaltyPointsBadgeProps {
  className?: string;
  showTier?: boolean;
  onClick?: () => void;
}

export function LoyaltyPointsBadge({
  className,
  showTier = true,
  onClick,
}: LoyaltyPointsBadgeProps) {
  const { account, isLoadingAccount } = useLoyalty();

  if (isLoadingAccount) {
    return (
      <div className={cn('animate-pulse bg-muted h-6 w-16 rounded-full', className)} />
    );
  }

  if (!account) {
    return null;
  }

  const tierColors = {
    BRONZE: 'bg-amber-100 text-amber-900 border-amber-200',
    SILVER: 'bg-slate-100 text-slate-900 border-slate-300',
    GOLD: 'bg-yellow-100 text-yellow-900 border-yellow-300',
    PLATINUM: 'bg-purple-100 text-purple-900 border-purple-300',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              'flex items-center gap-2 hover:opacity-80 transition-opacity',
              className
            )}
          >
            {showTier && (
              <Badge
                variant="outline"
                className={cn('font-semibold', tierColors[account.tier])}
              >
                {account.tier}
              </Badge>
            )}
            <Badge variant="secondary" className="gap-1">
              <Star className="h-3 w-3 fill-current" />
              <span className="font-semibold">{account.availablePoints.toLocaleString()}</span>
            </Badge>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">{account.tier} Member</p>
            <p className="text-sm">{account.availablePoints.toLocaleString()} points available</p>
            <p className="text-xs text-muted-foreground">
              {account.lifetimePoints.toLocaleString()} lifetime points
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
