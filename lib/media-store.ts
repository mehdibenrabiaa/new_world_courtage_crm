const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000"

export type MediaFile = {
  path: string
  url: string
  category: string
  size: number
  modifiedAt: string
  inUse: boolean
  usedBy: string[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromApi(m: any): MediaFile {
  return {
    path: m.path,
    url: m.url,
    category: m.category,
    size: m.size,
    modifiedAt: m.modified_at,
    inUse: m.in_use,
    usedBy: m.used_by ?? [],
  }
}

export async function listMedia(): Promise<MediaFile[]> {
  const res = await fetch(`${BASE}/api/media/`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch media")
  const data = await res.json()
  return data.map(fromApi)
}

export async function deleteMedia(path: string, force = false): Promise<void> {
  const url = new URL(`${BASE}/api/media/${path}`)
  if (force) url.searchParams.set("force", "true")
  const res = await fetch(url.toString(), { method: "DELETE" })
  if (res.status === 409) {
    const body = await res.json().catch(() => null)
    const err = new Error("in-use")
    ;(err as Error & { detail?: string }).detail = body?.detail
    throw err
  }
  if (!res.ok) throw new Error("Failed to delete media")
}
