'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLoyalty } from '@/hooks/useLoyalty';
import { useToast } from '@/hooks/use-toast';
import type { LoyaltyReward } from '@sew4mi/shared/types';

interface RedeemRewardDialogProps {
  reward: LoyaltyReward | null;
  onClose: () => void;
}

export function RedeemRewardDialog({ reward, onClose }: RedeemRewardDialogProps) {
  const { account, redeemReward, isRedeeming } = useLoyalty();
  const { toast } = useToast();

  const handleRedeem = async () => {
    if (!reward) return;

    try {
      await redeemReward({ rewardId: reward.id });
      toast({
        title: 'Reward redeemed!',
        description: `You've successfully redeemed "${reward.name}". Use it on your next order!`,
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Redemption failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!reward) return null;

  return (
    <Dialog open={!!reward} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redeem Reward</DialogTitle>
          <DialogDescription>Confirm your reward redemption</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-lg">{reward.name}</h4>
            <p className="text-sm text-muted-foreground">{reward.description}</p>
          </div>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="text-sm font-medium">Cost:</span>
            <Badge variant="secondary" className="text-lg">{reward.pointsCost} points</Badge>
          </div>
          {account && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <span className="text-sm">Your balance after redemption:</span>
              <span className="font-semibold">{(account.availablePoints - reward.pointsCost).toLocaleString()} points</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isRedeeming}>Cancel</Button>
          <Button onClick={handleRedeem} disabled={isRedeeming}>
            {isRedeeming ? 'Redeeming...' : 'Confirm Redemption'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
