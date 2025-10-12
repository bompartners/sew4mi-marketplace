'use client';

import { ArrowUpCircle, ArrowDownCircle, Gift as GiftIcon, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VirtualList } from '@/components/common/VirtualList';
import { useLoyalty } from '@/hooks/useLoyalty';
import { format } from 'date-fns';

export function LoyaltyHistory() {
  const { transactionHistory, isLoadingHistory } = useLoyalty();

  if (isLoadingHistory) {
    return <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" /></div>;
  }

  if (transactionHistory.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No transaction history yet.</p>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'EARN':
      case 'BONUS':
        return <ArrowUpCircle className="h-5 w-5 text-green-600" />;
      case 'REDEEM':
        return <ArrowDownCircle className="h-5 w-5 text-red-600" />;
      default:
        return <GiftIcon className="h-5 w-5 text-blue-600" />;
    }
  };

  // Use regular rendering for small lists (< 50 items)
  // Use virtual scrolling for large lists (>= 50 items) for better performance
  if (transactionHistory.length < 50) {
    return (
      <div className="space-y-3">
        {transactionHistory.map((transaction) => (
          <Card key={transaction.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {getIcon(transaction.type)}
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(transaction.createdAt), 'PPp')}
                  </p>
                </div>
              </div>
              <Badge variant={transaction.points > 0 ? 'default' : 'secondary'}>
                {transaction.points > 0 ? '+' : ''}{transaction.points}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <VirtualList
      items={transactionHistory}
      estimateSize={80}
      renderItem={(transaction) => (
        <div className="px-1 pb-3">
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {getIcon(transaction.type)}
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(transaction.createdAt), 'PPp')}
                  </p>
                </div>
              </div>
              <Badge variant={transaction.points > 0 ? 'default' : 'secondary'}>
                {transaction.points > 0 ? '+' : ''}{transaction.points}
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}
      emptyMessage="No transaction history yet."
    />
  );
}
