const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8001"

// ─── Types (used across CRM) ─────────────────────────────────────────────────

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
  // Card image
  imageUrl: string
  // Content
  blocks: Block[]
}

// ─── Mapping helpers ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromApi(p: any): Guide {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    category: p.category,
    status: p.status as Status,
    createdAt: p.created_at ? p.created_at.split("T")[0] : "",
    categoryHref: p.category_href ?? "",
    intro: p.intro ?? "",
    authorName: p.author_name ?? "",
    authorAvatar: p.author_avatar ?? "",
    editorName: p.editor_name ?? "",
    reviewerName: p.reviewer_name ?? "",
    updatedDate: p.updated_date ?? "",
    readingTime: p.reading_time ?? "",
    imageUrl: p.image_url ?? "",
    blocks: p.blocks ?? [],
  }
}

function toApi(g: Omit<Guide, "id" | "createdAt">) {
  return {
    title: g.title,
    slug: g.slug,
    category: g.category,
    status: g.status,
    category_href: g.categoryHref || null,
    intro: g.intro || null,
    author_name: g.authorName || null,
    author_avatar: g.authorAvatar || null,
    editor_name: g.editorName || null,
    reviewer_name: g.reviewerName || null,
    updated_date: g.updatedDate || null,
    reading_time: g.readingTime || null,
    image_url: g.imageUrl || null,
    blocks: g.blocks,
  }
}

// ─── API functions ───────────────────────────────────────────────────────────

export async function getGuides(category?: string): Promise<Guide[]> {
  const url = new URL(`${BASE}/api/guides/`)
  if (category) url.searchParams.set("category", category)
  const res = await fetch(url.toString(), { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch guides")
  const data = await res.json()
  return data.map(fromApi)
}

export async function getGuide(id: number): Promise<Guide | null> {
  const res = await fetch(`${BASE}/api/guides/${id}`, { cache: "no-store" })
  if (res.status === 404) return null
  if (!res.ok) throw new Error("Failed to fetch guide")
  return fromApi(await res.json())
}

export async function getGuideBySlug(slug: string): Promise<Guide | null> {
  const res = await fetch(`${BASE}/api/guides/slug/${slug}`, { cache: "no-store" })
  if (res.status === 404) return null
  if (!res.ok) throw new Error("Failed to fetch guide")
  return fromApi(await res.json())
}

export async function createGuide(partial: Omit<Guide, "id" | "createdAt" | "blocks">): Promise<Guide> {
  const res = await fetch(`${BASE}/api/guides/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toApi({ ...partial, blocks: [] })),
  })
  if (res.status === 409) throw new Error("slug-conflict")
  if (!res.ok) throw new Error("Failed to create guide")
  return fromApi(await res.json())
}

export async function saveGuide(guide: Guide): Promise<Guide> {
  const res = await fetch(`${BASE}/api/guides/${guide.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toApi(guide)),
  })
  if (!res.ok) throw new Error("Failed to save guide")
  return fromApi(await res.json())
}

export async function deleteGuide(id: number): Promise<void> {
  const res = await fetch(`${BASE}/api/guides/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Failed to delete guide")
}

export async function uploadGuideImage(guideId: number, file: File): Promise<Guide> {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch(`${BASE}/api/guides/${guideId}/image`, {
    method: "POST",
    body: form,
  })
  if (!res.ok) throw new Error("Failed to upload image")
  return fromApi(await res.json())
}

// ─── Client-side helpers ─────────────────────────────────────────────────────

export function uid() {
  return Math.random().toString(36).slice(2, 10)
}
