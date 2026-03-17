import type { ComponentType, SVGProps } from "react"
import {
  Netflix,
  Spotify,
  YouTube,
  GitHubDark,
  Figma,
  Notion,
  OpenAIDark,
  VercelDark,
  Supabase,
  Linear,
  Discord,
  Twitch,
  Slack,
  Dropbox,
  Adobe,
  Microsoft,
  AppleDark,
  GoogleDrive,
  Raycast,
  RailwayDark,
  OnePasswordDark,
  AppleMusic,
} from "@ridemountainpig/svgl-react"

export interface SubscriptionService {
  id: string
  name: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  color: string
}

export const subscriptionServices: SubscriptionService[] = [
  { id: "netflix", name: "Netflix", icon: Netflix, color: "#E50914" },
  { id: "spotify", name: "Spotify", icon: Spotify, color: "#1DB954" },
  { id: "youtube", name: "YouTube Premium", icon: YouTube, color: "#FF0000" },
  { id: "apple", name: "Apple", icon: AppleDark, color: "#000000" },
  { id: "apple-music", name: "Apple Music", icon: AppleMusic, color: "#FA243C" },
  { id: "google-drive", name: "Google Drive", icon: GoogleDrive, color: "#4285F4" },
  { id: "github", name: "GitHub", icon: GitHubDark, color: "#181717" },
  { id: "figma", name: "Figma", icon: Figma, color: "#F24E1E" },
  { id: "notion", name: "Notion", icon: Notion, color: "#000000" },
  { id: "openai", name: "ChatGPT", icon: OpenAIDark, color: "#10A37F" },
  { id: "vercel", name: "Vercel", icon: VercelDark, color: "#000000" },
  { id: "supabase", name: "Supabase", icon: Supabase, color: "#3ECF8E" },
  { id: "linear", name: "Linear", icon: Linear, color: "#5E6AD2" },
  { id: "discord", name: "Discord Nitro", icon: Discord, color: "#5865F2" },
  { id: "twitch", name: "Twitch", icon: Twitch, color: "#9146FF" },
  { id: "slack", name: "Slack", icon: Slack, color: "#4A154B" },
  { id: "dropbox", name: "Dropbox", icon: Dropbox, color: "#0061FF" },
  { id: "adobe", name: "Adobe Creative Cloud", icon: Adobe, color: "#FF0000" },
  { id: "microsoft", name: "Microsoft 365", icon: Microsoft, color: "#F25022" },
  { id: "1password", name: "1Password", icon: OnePasswordDark, color: "#0572EC" },
  { id: "raycast", name: "Raycast", icon: Raycast, color: "#FF6363" },
  { id: "railway", name: "Railway", icon: RailwayDark, color: "#0B0D0E" },
]

/** Find a service by its id */
export function findServiceById(id: string): SubscriptionService | undefined {
  return subscriptionServices.find((s) => s.id === id)
}

/** Find a service by name (case-insensitive partial match) */
export function findServiceByName(name: string): SubscriptionService | undefined {
  const lower = name.toLowerCase()
  return subscriptionServices.find((s) => s.name.toLowerCase().includes(lower))
}
