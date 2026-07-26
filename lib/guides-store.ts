export type Status = "Brouillon" | "Publié"

export type SectionBlock = { id: string; type: "section"; title: string; content: string }
export type AccentCardItem = { id: string; heading: string; body: string }
export type AccentCardBlock = { id: string; type: "accent-card"; title: string; cols: 1 | 2; items: AccentCardItem[] }
export type ParagraphBlock = { id: string; type: "paragraph"; content: string }
export type Block = SectionBlock | AccentCardBlock | ParagraphBlock

export type Guide = {
  id: number
  title: string
  slug: string
  category: string
  status: Status
  createdAt: string
  // Hero
  categoryHref: string
  intro: string
  authorName: string
  authorAvatar: string
  editorName: string
  reviewerName: string
  updatedDate: string
  readingTime: string
  // Content blocks
  blocks: Block[]
}

const STORAGE_KEY = "crm-guides-v1"

const SEED: Guide[] = [
  {
    id: 1,
    title: "Comment souscrire une assurance taxi ?",
    slug: "comment-souscrire-assurance-taxi",
    category: "Taxi",
    status: "Publié",
    createdAt: "2026-06-01",
    categoryHref: "/assurance-transport/taxi/",
    intro: "Souscrire une assurance taxi demande de réunir quelques documents clés et de comparer les offres du marché — voici comment procéder étape par étape.",
    authorName: "Loubna Moucharref",
    authorAvatar: "/team/loubna-moucharref.jpeg",
    editorName: "Anna Swartz",
    reviewerName: "Fabio Faschi, PLCS, SBCS, CLCS",
    updatedDate: "22 juillet 2026",
    readingTime: "4 minutes",
    blocks: [
      { id: "b1", type: "section", title: "1. Rassemblez les documents nécessaires", content: "Avant de démarrer vos démarches, préparez les pièces que tout assureur vous demandera pour établir un devis :" },
      { id: "b2", type: "accent-card", title: "", cols: 1, items: [{ id: "i1", heading: "Documents nécessaires", body: "Permis de conduire, carte grise, carte professionnelle de taxi (carte verte), autorisation de stationnement (ADS), relevé d'information." }] },
      { id: "b3", type: "section", title: "2. Comparez les offres du marché", content: "Vous pouvez souscrire directement auprès d'un assureur, via un agent local, ou en passant par un courtier spécialisé comme New World Courtage." },
      { id: "b4", type: "section", title: "3. Choisissez vos garanties", content: "L'assurance taxi comporte des garanties spécifiques à l'activité de transport rémunéré de personnes : responsabilité civile professionnelle, dommages tous accidents, protection juridique, assistance dépannage." },
      { id: "b5", type: "section", title: "4. Signez votre contrat", content: "Une fois l'offre choisie, la souscription se fait généralement sous 24 à 48h : signature électronique du contrat, mise en place du prélèvement, et remise de votre attestation d'assurance." },
      { id: "b6", type: "accent-card", title: "Vous pouvez opter pour des options supplémentaires", cols: 1, items: [{ id: "i2", heading: "Options disponibles", body: "Dégâts sur équipements, assistance dépannage, perte de recette, garantie car-jacking, frais de stage de récupération de points." }] },
    ],
  },
  {
    id: 2, title: "De quelle couverture ai-je besoin pour mon taxi ?", slug: "quelle-couverture-assurance-taxi",
    category: "Taxi", status: "Publié", createdAt: "2026-06-03",
    categoryHref: "/assurance-transport/taxi/", intro: "", authorName: "Loubna Moucharref", authorAvatar: "/team/loubna-moucharref.jpeg",
    editorName: "", reviewerName: "", updatedDate: "22 juillet 2026", readingTime: "3 minutes", blocks: [],
  },
  {
    id: 3, title: "Comment choisir son assurance taxi ?", slug: "comment-choisir-assurance-taxi",
    category: "Taxi", status: "Publié", createdAt: "2026-06-05",
    categoryHref: "/assurance-transport/taxi/", intro: "", authorName: "Loubna Moucharref", authorAvatar: "/team/loubna-moucharref.jpeg",
    editorName: "", reviewerName: "", updatedDate: "22 juillet 2026", readingTime: "3 minutes", blocks: [],
  },
  {
    id: 4, title: "Comment souscrire une assurance ambulance ?", slug: "comment-souscrire-assurance-ambulance",
    category: "Ambulance", status: "Publié", createdAt: "2026-06-08",
    categoryHref: "/assurance-transport/ambulance/", intro: "", authorName: "Loubna Moucharref", authorAvatar: "/team/loubna-moucharref.jpeg",
    editorName: "", reviewerName: "", updatedDate: "22 juillet 2026", readingTime: "4 minutes", blocks: [],
  },
  {
    id: 5, title: "Quelle couverture pour une assurance ambulance ?", slug: "quelle-couverture-assurance-ambulance",
    category: "Ambulance", status: "Publié", createdAt: "2026-06-10",
    categoryHref: "/assurance-transport/ambulance/", intro: "", authorName: "Loubna Moucharref", authorAvatar: "/team/loubna-moucharref.jpeg",
    editorName: "", reviewerName: "", updatedDate: "22 juillet 2026", readingTime: "3 minutes", blocks: [],
  },
  {
    id: 6, title: "Comment choisir son assurance ambulance ?", slug: "comment-choisir-assurance-ambulance",
    category: "Ambulance", status: "Publié", createdAt: "2026-06-12",
    categoryHref: "/assurance-transport/ambulance/", intro: "", authorName: "Loubna Moucharref", authorAvatar: "/team/loubna-moucharref.jpeg",
    editorName: "", reviewerName: "", updatedDate: "22 juillet 2026", readingTime: "3 minutes", blocks: [],
  },
  {
    id: 7, title: "Les garanties indispensables pour une flotte de transport", slug: "garanties-flotte-transport",
    category: "Flotte & Transport", status: "Brouillon", createdAt: "2026-06-20",
    categoryHref: "/assurance-transport/", intro: "", authorName: "Loubna Moucharref", authorAvatar: "/team/loubna-moucharref.jpeg",
    editorName: "", reviewerName: "", updatedDate: "", readingTime: "", blocks: [],
  },
  {
    id: 8, title: "Assurance décennale : guide complet pour les artisans", slug: "assurance-decennale-guide",
    category: "Construction", status: "Brouillon", createdAt: "2026-07-01",
    categoryHref: "/assurance-construction/", intro: "", authorName: "Loubna Moucharref", authorAvatar: "/team/loubna-moucharref.jpeg",
    editorName: "", reviewerName: "", updatedDate: "", readingTime: "", blocks: [],
  },
]

function load(): Guide[] {
  if (typeof window === "undefined") return SEED
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Guide[]) : SEED
  } catch {
    return SEED
  }
}

function persist(guides: Guide[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(guides))
}

export function getGuides(): Guide[] {
  return load()
}

export function getGuide(id: number): Guide | undefined {
  return load().find((g) => g.id === id)
}

export function saveGuide(guide: Guide) {
  const guides = load()
  const idx = guides.findIndex((g) => g.id === guide.id)
  if (idx >= 0) guides[idx] = guide
  else guides.unshift(guide)
  persist(guides)
}

export function deleteGuide(id: number) {
  persist(load().filter((g) => g.id !== id))
}

export function createGuide(partial: Omit<Guide, "id" | "createdAt" | "blocks">): Guide {
  const guides = load()
  const id = Math.max(0, ...guides.map((g) => g.id)) + 1
  const guide: Guide = {
    ...partial,
    id,
    createdAt: new Date().toISOString().split("T")[0],
    blocks: [],
  }
  guides.unshift(guide)
  persist(guides)
  return guide
}

export function uid() {
  return Math.random().toString(36).slice(2, 10)
}
