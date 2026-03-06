import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ConditionalLayout } from "@/components/ConditionalLayout"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Shipyard OS",
  description: "The open-source Agent OS for solo founders",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ backgroundColor: "#0a0a0f", color: "#e4e4e7" }}
      >
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  )
}
