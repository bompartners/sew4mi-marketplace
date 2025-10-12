'use client';

/**
 * Component for Story 4.3: Loyalty Dashboard
 */

import { Star, TrendingUp, Gift, History } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLoyalty } from '@/hooks/useLoyalty';
import { RewardsGallery } from './RewardsGallery';
import { LoyaltyHistory } from './LoyaltyHistory';
import { LOYALTY_TIER_THRESHOLDS, LOYALTY_TIER_BONUSES } from '@sew4mi/shared/types';

export function LoyaltyDashboard() {
  const { account, pointsForNextTier, isLoadingAccount } = useLoyalty();

  if (isLoadingAccount) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <Star className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Loyalty Program</h3>
        <p className="text-muted-foreground">
          Complete your first order to start earning points!
        </p>
      </div>
    );
  }

  const tierColors = {
    BRONZE: 'from-amber-500 to-amber-700',
    SILVER: 'from-slate-400 to-slate-600',
    GOLD: 'from-yellow-400 to-yellow-600',
    PLATINUM: 'from-purple-500 to-purple-700',
  };

  const nextTierProgress = pointsForNextTier
    ? ((account.lifetimePoints / (account.lifetimePoints + pointsForNextTier)) * 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Loyalty Rewards</CardTitle>
              <CardDescription>Your points and tier status</CardDescription>
            </div>
            <div
              className={`h-16 w-16 rounded-full bg-gradient-to-br ${tierColors[account.tier]} flex items-center justify-center`}
            >
              <Star className="h-8 w-8 text-white fill-current" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Points Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Available Points</p>
              <p className="text-3xl font-bold">{account.availablePoints.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Lifetime Points</p>
              <p className="text-3xl font-bold">{account.lifetimePoints.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Current Tier</p>
              <Badge className={`text-lg px-3 py-1 bg-gradient-to-r ${tierColors[account.tier]}`}>
                {account.tier}
              </Badge>
            </div>
          </div>

          {/* Tier Progress */}
          {pointsForNextTier !== null && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress to next tier</span>
                <span className="font-medium">
                  {pointsForNextTier.toLocaleString()} points needed
                </span>
              </div>
              <Progress value={nextTierProgress} className="h-2" />
            </div>
          )}

          {/* Tier Benefits */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="font-semibold text-sm">Your Benefits</p>
            <ul className="space-y-1 text-sm">
              <li className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span>{LOYALTY_TIER_BONUSES[account.tier]}% bonus on all points earned</span>
              </li>
              {account.tier === 'GOLD' && (
                <li className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-primary" />
                  <span>Priority customer support</span>
                </li>
              )}
              {account.tier === 'PLATINUM' && (
                <>
                  <li className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-primary" />
                    <span>Priority customer support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" />
                    <span>Access to exclusive premium tailors</span>
                  </li>
                </>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Rewards and History Tabs */}
      <Tabs defaultValue="rewards" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="rewards">
            <Gift className="h-4 w-4 mr-2" />
            Rewards
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>
        <TabsContent value="rewards" className="mt-6">
          <RewardsGallery />
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <LoyaltyHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
