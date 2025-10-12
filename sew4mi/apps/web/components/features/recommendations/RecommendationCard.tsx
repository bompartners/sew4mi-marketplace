'use client';

import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Recommendation } from '@sew4mi/shared/types';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onView: () => void;
}

export function RecommendationCard({ recommendation, onView }: RecommendationCardProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'garment':
        return 'bg-blue-100 text-blue-900';
      case 'tailor':
        return 'bg-green-100 text-green-900';
      case 'fabric':
        return 'bg-purple-100 text-purple-900';
      default:
        return 'bg-gray-100 text-gray-900';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{recommendation.itemId}</CardTitle>
          <Badge variant="outline" className={getTypeColor(recommendation.type)}>
            {recommendation.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{recommendation.reason}</p>
        <div className="flex items-center gap-2 mt-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{recommendation.score}% match</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" onClick={onView} className="w-full">
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}
