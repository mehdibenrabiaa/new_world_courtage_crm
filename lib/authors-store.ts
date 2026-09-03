const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000"

export type Author = {
  id: number
  name: string
  avatarUrl: string
  createdAt: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromApi(a: any): Author {
  return {
    id: a.id,
    name: a.name,
    avatarUrl: a.avatar_url ?? "",
    createdAt: a.created_at ? a.created_at.split("T")[0] : "",
  }
}

export async function getAuthors(): Promise<Author[]> {
  const res = await fetch(`${BASE}/api/authors/`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch authors")
  const data = await res.json()
  return data.map(fromApi)
}

export async function createAuthor(name: string): Promise<Author> {
  const res = await fetch(`${BASE}/api/authors/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  if (res.status === 409) throw new Error("name-conflict")
  if (!res.ok) throw new Error("Failed to create author")
  return fromApi(await res.json())
}

export async function updateAuthor(id: number, name: string): Promise<Author> {
  const res = await fetch(`${BASE}/api/authors/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  if (res.status === 409) throw new Error("name-conflict")
  if (!res.ok) throw new Error("Failed to update author")
  return fromApi(await res.json())
}

export async function deleteAuthor(id: number): Promise<void> {
  const res = await fetch(`${BASE}/api/authors/${id}`, { method: "DELETE" })
  if (res.status === 409) throw new Error("in-use")
  if (!res.ok) throw new Error("Failed to delete author")
}

export async function uploadAuthorImage(id: number, file: File): Promise<Author> {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch(`${BASE}/api/authors/${id}/image`, {
    method: "POST",
    body: form,
  })
  if (!res.ok) throw new Error("Failed to upload image")
  return fromApi(await res.json())
}
