import { catalogFetch } from './catalog-client';
import { tokenStore } from './client';
const guest = () =>
  typeof window === 'undefined'
    ? ''
    : localStorage.getItem('nova-guest-session') ||
      (() => {
        // Some embedded/QA browsers do not expose crypto.randomUUID().
        const uuid =
          typeof crypto?.randomUUID === 'function'
            ? crypto.randomUUID()
            : `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem('nova-guest-session', uuid);
        return uuid;
      })();
const opts = () => ({ headers: tokenStore.get() ? {} : { 'x-guest-session-id': guest() } });
export const cartApi = { get:()=>catalogFetch('/cart',opts()), add:(body:any)=>catalogFetch('/cart/items',{...opts(),method:'POST',body:JSON.stringify(body)}), update:(id:string,quantity:number)=>catalogFetch(`/cart/items/${id}`,{...opts(),method:'PATCH',body:JSON.stringify({quantity})}), remove:(id:string)=>catalogFetch(`/cart/items/${id}`,{...opts(),method:'DELETE'}), clear:()=>catalogFetch('/cart',{...opts(),method:'DELETE'}), applyCoupon:(code:string)=>catalogFetch('/cart/apply-coupon',{...opts(),method:'POST',body:JSON.stringify({code})}), removeCoupon:()=>catalogFetch('/cart/coupon',{...opts(),method:'DELETE'}) };
