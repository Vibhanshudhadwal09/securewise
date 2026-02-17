'use client';

import { Badge } from '@/components/ui/badge';

export default function DifficultyBadge(props: { difficulty: 'easy' | 'medium' | 'advanced' }) {
  const { difficulty } = props;
  const styles =
    difficulty === 'easy'
      ? 'bg-green-50 text-green-700 border-green-200'
      : difficulty === 'medium'
        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
        : 'bg-orange-50 text-orange-700 border-orange-200';
  const label = difficulty === 'easy' ? 'Easy' : difficulty === 'medium' ? 'Medium' : 'Advanced';
  return <Badge className={styles}>{label}</Badge>;
}
