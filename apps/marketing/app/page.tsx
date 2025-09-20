import { marketingDomain } from '@voldegard/shared';

export default function Page() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">{marketingDomain}</h1>
      <p>Marketing app</p>
    </main>
  );
}
