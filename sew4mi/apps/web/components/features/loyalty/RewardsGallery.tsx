'use client';

/**
 * Component for Story 4.3: Rewards Gallery
 */

import { useState } from 'react';
import { Gift, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLoyalty } from '@/hooks/useLoyalty';
import { RedeemRewardDialog } from './RedeemRewardDialog';
import type { LoyaltyReward } from '@sew4mi/shared/types';

export function RewardsGallery() {
  const { account, rewards, affordableRewards, isLoadingRewards } = useLoyalty();
  const [selectedReward, setSelectedReward] = useState<LoyaltyReward | null>(null);

  if (isLoadingRewards) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (rewards.length === 0) {
    return (
      <div className="text-center py-8">
        <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No rewards available at this time.</p>
      </div>
    );
  }

  const canAfford = (reward: LoyaltyReward) => {
    return account && account.availablePoints >= reward.pointsCost;
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'DISCOUNT':
        return '💰';
      case 'FREE_DELIVERY':
        return '🚚';
      case 'PRIORITY':
        return '⚡';
      default:
        return '🎁';
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rewards.map((reward) => {
          const affordable = canAfford(reward);

          return (
            <Card
              key={reward.id}
              className={`relative overflow-hidden ${!affordable ? 'opacity-60' : ''}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">{getRewardIcon(reward.rewardType)}</span>
                      {reward.name}
                    </CardTitle>
                    <CardDescription className="mt-2">{reward.description}</CardDescription>
                  </div>
                  {!affordable && <Lock className="h-5 w-5 text-muted-foreground" />}
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  {reward.discountPercentage && (
                    <Badge variant="secondary" className="text-lg">
                      {reward.discountPercentage}% OFF
                    </Badge>
                  )}
                  {reward.discountAmount && (
                    <Badge variant="secondary" className="text-lg">
                      GHS {reward.discountAmount.toFixed(2)} OFF
                    </Badge>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between">
                <div className="text-sm">
                  <p className="font-semibold">{reward.pointsCost.toLocaleString()} points</p>
                  {account && !affordable && (
                    <p className="text-xs text-muted-foreground">
                      Need {(reward.pointsCost - account.availablePoints).toLocaleString()} more
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => setSelectedReward(reward)}
                  disabled={!affordable}
                >
                  {affordable ? 'Redeem' : 'Locked'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <RedeemRewardDialog
        reward={selectedReward}
        onClose={() => setSelectedReward(null)}
      />
    </>
  );
}
