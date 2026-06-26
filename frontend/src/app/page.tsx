import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

// Root simply routes to the right place based on the session cookie.
export default async function Home() {
  const store = await cookies();
  const role = store.get('pacra_role')?.value;
  if (role === 'REVIEWER') redirect('/reviewer');
  if (role === 'APPLICANT') redirect('/applicant');
  redirect('/login');
}
