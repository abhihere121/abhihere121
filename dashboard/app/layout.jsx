import "@shopify/polaris/build/esm/styles.css";
import { Providers } from "./providers";
import { AppFrame } from "./ui/AppFrame";

export const metadata = {
  title: "SizeSignal Dashboard",
  description: "SizeSignal enterprise dashboard"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#F8FAFC" }}>
        <Providers>
          <AppFrame>{children}</AppFrame>
        </Providers>
      </body>
    </html>
  );
}
