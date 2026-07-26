"use client"

import { useEffect, useState } from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MoreHorizontalIcon, MailOpenIcon, Trash2Icon, EyeIcon } from "lucide-react"
import { listContacts, markContactRead, deleteContact, type Contact } from "@/lib/api"

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

function formatDate(iso: string) {
  const [year, month, day] = iso.split("T")[0].split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState<Contact | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    listContacts()
      .then(setContacts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalPages = Math.max(1, Math.ceil(contacts.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginated = contacts.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  function openView(c: Contact) {
    setViewing(c)
    if (!c.read) {
      markContactRead(c.id)
        .then(() => setContacts((prev) => prev.map((x) => x.id === c.id ? { ...x, read: true } : x)))
        .catch(() => {})
    }
  }

  function handleDelete(id: number) {
    deleteContact(id)
      .then(() => setContacts((prev) => prev.filter((c) => c.id !== id)))
      .catch(() => {})
  }

  const unreadCount = contacts.filter((c) => !c.read).length

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Tableau de bord</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Contacts</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {unreadCount > 0 && (
            <Badge className="ml-2 bg-amber-100 text-amber-700">{unreadCount} non lu{unreadCount > 1 ? "s" : ""}</Badge>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {loading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : contacts.length === 0 ? (
          <div className="text-sm text-muted-foreground">Aucun contact pour le moment.</div>
        ) : (
          <>
            <Table containerClassName="max-h-[70vh] overflow-y-auto rounded-xl border">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 z-10 bg-background w-4" />
                  <TableHead className="sticky top-0 z-10 bg-background">Nom</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background">Email</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background">Téléphone</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background">Reçu le</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background">Statut</TableHead>
                  <TableHead className="sticky top-0 z-10 w-10 bg-background" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((c) => (
                  <TableRow key={c.id} className={!c.read ? "font-medium" : ""}>
                    <TableCell>
                      {!c.read && <span className="block w-2 h-2 rounded-full bg-amber-400" />}
                    </TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    <TableCell>{formatDate(c.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={c.read ? "bg-gray-100 text-gray-500" : "bg-amber-100 text-amber-700"}>
                        {c.read ? "Lu" : "Non lu"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontalIcon />
                              <span className="sr-only">Actions</span>
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openView(c)}>
                            <EyeIcon />
                            Voir le message
                          </DropdownMenuItem>
                          {!c.read && (
                            <DropdownMenuItem onClick={() => {
                              markContactRead(c.id)
                                .then(() => setContacts((prev) => prev.map((x) => x.id === c.id ? { ...x, read: true } : x)))
                                .catch(() => {})
                            }}>
                              <MailOpenIcon />
                              Marquer comme lu
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem variant="destructive" onClick={() => handleDelete(c.id)}>
                            <Trash2Icon />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Lignes par page</span>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1) }}>
                  <SelectTrigger size="sm" className="w-18">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Page {currentPage} sur {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Précédent</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Suivant</Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message de {viewing?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Email</span>
              <span>{viewing?.email}</span>
            </div>
            {viewing?.phone && (
              <div className="flex gap-2">
                <span className="text-muted-foreground w-20 shrink-0">Téléphone</span>
                <span>{viewing.phone}</span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Reçu le</span>
              <span>{viewing ? formatDate(viewing.created_at) : ""}</span>
            </div>
            <div className="mt-2 p-4 rounded-lg bg-muted text-sm leading-relaxed whitespace-pre-wrap">
              {viewing?.message}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
