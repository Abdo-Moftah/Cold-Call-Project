import "./globals.css";

export const metadata = {
  title: "Outreach OS | Cold Caller Second Brain",
  description: "A lightning-fast, distraction-free tool for cold calling.",
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
