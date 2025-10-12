/**
 * Hook for Story 4.3: Loyalty System Management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { LoyaltyAccount, LoyaltyTransaction, LoyaltyReward } from '@sew4mi/shared/types';

interface LoyaltyAccountResponse {
  account: LoyaltyAccount;
  recentTransactions: LoyaltyTransaction[];
  pointsForNextTier: number | null;
}

export function useLoyalty() {
  const queryClient = useQueryClient();

  // Fetch loyalty account
  const {
    data: accountData,
    isLoading: isLoadingAccount,
    error: accountError,
  } = useQuery<LoyaltyAccountResponse>({
    queryKey: ['loyalty-account'],
    queryFn: async () => {
      const response = await fetch('/api/loyalty/account');
      if (!response.ok) {
        throw new Error('Failed to fetch loyalty account');
      }
      return response.json();
    },
  });

  // Fetch rewards
  const {
    data: rewardsData,
    isLoading: isLoadingRewards,
  } = useQuery<{ rewards: LoyaltyReward[] }>({
    queryKey: ['loyalty-rewards'],
    queryFn: async () => {
      const response = await fetch('/api/loyalty/rewards');
      if (!response.ok) {
        throw new Error('Failed to fetch rewards');
      }
      return response.json();
    },
  });

  // Fetch affordable rewards
  const {
    data: affordableRewardsData,
    isLoading: isLoadingAffordable,
  } = useQuery<{ rewards: LoyaltyReward[] }>({
    queryKey: ['loyalty-rewards-affordable'],
    queryFn: async () => {
      const response = await fetch('/api/loyalty/rewards?affordable=true');
      if (!response.ok) {
        throw new Error('Failed to fetch affordable rewards');
      }
      return response.json();
    },
    enabled: !!accountData?.account,
  });

  // Fetch transaction history
  const {
    data: historyData,
    isLoading: isLoadingHistory,
  } = useQuery<{ transactions: LoyaltyTransaction[] }>({
    queryKey: ['loyalty-history'],
    queryFn: async () => {
      const response = await fetch('/api/loyalty/history?limit=50');
      if (!response.ok) {
        throw new Error('Failed to fetch transaction history');
      }
      return response.json();
    },
  });

  // Redeem reward mutation
  const redeemMutation = useMutation({
    mutationFn: async ({ rewardId, orderId }: { rewardId: string; orderId?: string }) => {
      const response = await fetch('/api/loyalty/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId, orderId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to redeem reward');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all loyalty queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['loyalty-account'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-rewards-affordable'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-history'] });
    },
  });

  return {
    // Account data
    account: accountData?.account,
    recentTransactions: accountData?.recentTransactions || [],
    pointsForNextTier: accountData?.pointsForNextTier,
    isLoadingAccount,
    accountError,

    // Rewards
    rewards: rewardsData?.rewards || [],
    affordableRewards: affordableRewardsData?.rewards || [],
    isLoadingRewards,
    isLoadingAffordable,

    // Transaction history
    transactionHistory: historyData?.transactions || [],
    isLoadingHistory,

    // Actions
    redeemReward: redeemMutation.mutateAsync,
    isRedeeming: redeemMutation.isPending,
    redeemError: redeemMutation.error,

    // Loading states
    isLoading: isLoadingAccount || isLoadingRewards,
  };
}
