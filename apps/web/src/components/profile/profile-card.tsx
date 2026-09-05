import Link from 'next/link';
import { Mail, Phone } from 'lucide-react';
import { User } from '@/types/auth';
import { AvatarUpload } from './avatar-upload';

export function ProfileCard({ user }: { user: User }) {
  return (
    <section className="profile-card">
      <div className="profile-identity">
        <AvatarUpload user={user} />
        <div><p className="profile-label">PERSONAL PROFILE</p><h3>{user.fullName ?? user.email}</h3><span>{user.role.toLowerCase()} member</span></div>
      </div>
      <div className="profile-contact">
        <p><Mail size={15} /><span>{user.email}</span></p>
        <p><Phone size={15} /><span>{user.phone ?? 'Add a phone number'}</span></p>
      </div>
      <Link href="/profile/settings">Edit profile <span aria-hidden="true">↗</span></Link>
    </section>
  );
}
