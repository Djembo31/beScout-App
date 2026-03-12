'use client';

import Image from 'next/image';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CosmeticAvatarProps {
  avatarUrl: string | null;
  displayName: string;
  size?: number;
  frameCssClass?: string | null;
  className?: string;
}

export function CosmeticAvatar({
  avatarUrl,
  displayName,
  size = 48,
  frameCssClass,
  className,
}: CosmeticAvatarProps) {
  return (
    <div
      className={cn(
        'relative shrink-0 rounded-2xl bg-gold/10 overflow-hidden',
        frameCssClass
          ? cn('border-2', frameCssClass)
          : 'border border-white/10',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={displayName}
          fill
          className="object-cover"
        />
      ) : (
        <div className="flex items-center justify-center size-full">
          <User className="size-5 text-white/40" />
        </div>
      )}
    </div>
  );
}
