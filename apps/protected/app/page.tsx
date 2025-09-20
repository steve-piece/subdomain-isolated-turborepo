import { appDomain } from '@voldegard/shared';

export default function Page() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">{appDomain}</h1>
      <p>Protected app</p>
    </main>
  );
}
