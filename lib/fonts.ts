import { Playfair_Display } from "next/font/google"

// Matches the public site's serif display face (new_world_courtage/lib/fonts.js),
// used only inside the guide editor's live-preview so the title/intro editing
// experience matches how they'll actually render.
export const articleSerif = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  style: ["normal"],
  display: "swap",
})
