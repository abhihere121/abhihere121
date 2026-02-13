import { Providers } from "./providers";
import { AppFrame } from "./ui/AppFrame";

export const metadata = {
  title: "SizeSignal Dashboard",
  description: "SizeSignal enterprise dashboard"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, background: "#E7E0EC", fontFamily: "Roboto, sans-serif" }}>
        <Providers>
          <AppFrame>{children}</AppFrame>
        </Providers>
      </body>
    </html>
  );
}
