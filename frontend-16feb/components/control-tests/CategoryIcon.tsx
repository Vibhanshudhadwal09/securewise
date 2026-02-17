'use client';

import { Shield, Lock, Network, Monitor } from 'lucide-react';

const categoryIcons: Record<string, any> = {
  access_control: Shield,
  data_protection: Lock,
  network_security: Network,
  endpoint_security: Monitor,
};

export default function CategoryIcon(props: { category: string; size?: number; className?: string }) {
  const { category, size = 16, className } = props;
  const Icon = categoryIcons[category] || Shield;
  return <Icon size={size} className={className} />;
}
