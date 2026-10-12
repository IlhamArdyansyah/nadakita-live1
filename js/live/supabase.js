/** Batas akses data bersama: konfigurasi, adapter native, format uang, escape, dan guard sesi. */
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';
import { createNativeClient } from './native-client.js';

export const configured =
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL) &&
  SUPABASE_PUBLISHABLE_KEY.startsWith('sb_publishable_');

// Authentication and database calls use browser-native fetch. This avoids the
// CDN dependency that prevented the previous sign-in form from initializing.
export let sdkLoadError = null;
export const supabase = configured
  ? createNativeClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;
export const money = n => 'Rp' + Number(n || 0).toLocaleString('id-ID');
export const esc = x =>
  String(x ?? '').replace(
    /[&<>"']/g,
    s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s]
  );
/** Buka hasil {data,error}; lempar error agar renderer memakai jalur penanganan yang sama. */
export async function req(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
/** Verifikasi pengguna melalui Auth; jangan menjadikan metadata profil sebagai sumber role. */
export async function currentUser() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}
/** Role diperiksa lewat RPC is_admin berdasarkan admin_grants yang dilindungi database. */
export async function isAdmin() {
  if (!supabase) return false;
  const user = await currentUser();
  if (!user) return false;
  return !!(await req(supabase.rpc('is_admin')));
}
/** Wajibkan sesi; guest checkout boleh membuat sesi anonymous bila opsi guest aktif. */
export async function requireUser({ guest = false } = {}) {
  let user = await currentUser();
  if (!user && guest) {
    const result = await supabase.auth.signInAnonymously();
    if (result.error) throw result.error;
    user = result.data.user;
  }
  if (!user) throw new Error('Silakan masuk akun sebelum melanjutkan.');
  return user;
}
/** Tampilkan error sebagai textContent, bukan HTML yang berasal dari respons eksternal. */
export function report(error) {
  console.error(error);
  const alert = document.querySelector('#live-message');
  if (alert) {
    alert.textContent = error.message || String(error);
    alert.hidden = false;
    alert.setAttribute('role', 'alert');
  } else window.alert(error.message || String(error));
}
