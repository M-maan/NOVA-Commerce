import Image from 'next/image';
import type { User } from '@/types/auth';

export function AvatarUpload({ user }: { user: User }) {
  const initials = [user.firstName, user.lastName].filter(Boolean).map((part) => part?.charAt(0)).join('') || user.email.charAt(0);
  return (
    <div className="profile-avatar" aria-label={`${user.fullName ?? user.email} avatar`}>
      {user.profileImage ? <Image src={user.profileImage} alt="" fill sizes="92px" unoptimized className="object-cover" /> : <span>{initials.toUpperCase()}</span>}
    </div>
  );
}
