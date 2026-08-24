'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AddressCard } from '@/components/profile/address-card';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/stores/user.store';

const schema = z.object({
  title: z.string().min(1),
  fullName: z.string().min(1),
  phone: z.string().min(6),
  country: z.string().min(1),
  province: z.string().min(1),
  city: z.string().min(1),
  postalCode: z.string().optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export default function AddressesPage() {
  const { addresses, loadAddresses, createAddress, updateAddress, deleteAddress } = useUserStore();
  const [submitError, setSubmitError] = useState('');
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { title: '', fullName: '', phone: '', country: '', province: '', city: '', postalCode: '', addressLine1: '', addressLine2: '', isDefault: false } });
  useEffect(() => { void loadAddresses(); }, [loadAddresses]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      <section className="rounded-lg border p-5">
        <h1 className="text-2xl font-bold">Add address</h1>
        <form className="mt-5 space-y-3" onSubmit={form.handleSubmit(async (values) => { setSubmitError(''); try { await createAddress(values); form.reset(); } catch (error) { setSubmitError(error instanceof Error ? error.message : 'Unable to save address.'); } })}>
          {submitError && <p role="alert" className="rounded border border-red-400 p-3 text-sm text-red-500">{submitError}</p>}
          {['title', 'fullName', 'phone', 'country', 'province', 'city', 'postalCode', 'addressLine1', 'addressLine2'].map((name) => (
            <label key={name} className="block text-sm font-medium">{name}<input className="mt-1 w-full rounded-md border bg-background px-3 py-2" {...form.register(name as keyof z.infer<typeof schema>)} /></label>
          ))}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('isDefault')} />Set as default</label>
          <Button>Add address</Button>
        </form>
      </section>
      <section>
        <h2 className="text-2xl font-bold">Saved addresses</h2>
        <div className="mt-5 space-y-3">
          {addresses.map((address) => <AddressCard key={address.id} address={address} onDelete={() => void deleteAddress(address.id)} onDefault={() => void updateAddress(address.id, { isDefault: true })} />)}
          {!addresses.length ? <p className="rounded-lg border p-5 text-sm text-gray-500">No addresses yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
