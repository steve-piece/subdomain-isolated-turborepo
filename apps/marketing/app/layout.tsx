export const metadata = {
  title: 'Voldegard Marketing',
  description: 'Marketing site'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
