export const metadata = {
  title: "Dynamic index routing · Agent Studio",
  description: "Application-owned dynamic index routing with direct Algolia Agent Studio.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head><link rel="stylesheet" href="/styles.css" /></head>
      <body>{children}</body>
    </html>
  );
}
