'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    CalendarDays,
    Scissors,
    User,
    Clock3,
    Ban,
    ImageIcon,
    FileText,
    Star,
    LogOut,
    Menu,
    X,
    Settings,
    CreditCard,
} from 'lucide-react'
import { AdminLogoutButton } from '@/src/features/auth/components/admin-logout-button'
import {
    canManageAppointments,
    canManageBusiness,
    canManageCatalog,
    canManageReviews,
} from '@/src/features/auth/utils/admin-access'

const PRIMARY = '#C8942E'

function buildLinks(slug: string, role: string) {
    if (role === 'barber') {
        return [
            { href: '/admin/mi-agenda', label: 'Mi agenda', icon: CalendarDays },
            { href: '/admin/mis-reservas', label: 'Mis reservas', icon: CalendarDays },
            { href: '/admin/mi-perfil', label: 'Mi perfil', icon: User },
            { href: `/admin/b/${slug}/horarios`, label: 'Mis horarios', icon: Clock3 },
            { href: `/admin/b/${slug}/bloqueos`, label: 'Mis bloqueos', icon: Ban },
            { href: `/admin/b/${slug}/galeria`, label: 'Mi galería', icon: ImageIcon },
        ]
    }

    const links = []

    if (canManageAppointments(role)) {
        links.push({ href: `/admin/b/${slug}/reservas`, label: 'Reservas', icon: CalendarDays })
        links.push({ href: `/admin/b/${slug}/horarios`, label: 'Horarios', icon: Clock3 })
        links.push({ href: `/admin/b/${slug}/bloqueos`, label: 'Bloqueos', icon: Ban })
    }

    if (canManageCatalog(role)) {
        links.push({ href: `/admin/b/${slug}/servicios`, label: 'Servicios', icon: Scissors })
        links.push({ href: `/admin/b/${slug}/barberos`, label: 'Barberos', icon: User })
        links.push({ href: `/admin/b/${slug}/galeria`, label: 'Galería', icon: ImageIcon })
    }

    if (canManageReviews(role)) {
        links.push({ href: `/admin/b/${slug}/reviews`, label: 'Reviews', icon: Star })
    }

    if (canManageBusiness(role)) {
        links.push({ href: `/admin/b/${slug}/plan`, label: 'Plan', icon: CreditCard })
        links.push({ href: `/admin/b/${slug}/negocio`, label: 'Negocio', icon: Settings })
    }

    return links
}

function NavLinks({
    pathname,
    businessSlug,
    role,
    onNavigate,
}: {
    pathname: string
    businessSlug: string
    role: string
    onNavigate?: () => void
}) {
    const links = buildLinks(businessSlug, role)

    return (
        <nav className="space-y-1 px-3">
            {links.map((link) => {
                const isActive = pathname === link.href
                const Icon = link.icon

                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        onClick={onNavigate}
                        className={`group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition duration-200 ${isActive
                            ? 'bg-[rgba(200,148,46,0.12)] text-white ring-1 ring-[rgba(200,148,46,0.24)]'
                            : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
                            }`}
                    >
                        {isActive && (
                            <span
                                className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full"
                                style={{ backgroundColor: PRIMARY }}
                            />
                        )}

                        <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${isActive
                                ? 'bg-[rgba(200,148,46,0.18)] text-[#C8942E]'
                                : 'bg-white/[0.04] text-slate-500 group-hover:bg-white/[0.08] group-hover:text-slate-200'
                                }`}
                        >
                            <Icon className="h-4 w-4 stroke-[1.9]" />
                        </span>

                        <span className="truncate">{link.label}</span>
                    </Link>
                )
            })}
        </nav>
    )
}

export function AdminNav({
    businessSlug,
    businessName,
    role,
}: {
    businessSlug: string
    businessName?: string
    role: string
}) {
    const pathname = usePathname()
    const [open, setOpen] = useState(false)

    return (
        <>
            <div className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-white/10 bg-[#0f1115]/95 px-5 backdrop-blur md:hidden">
                <div className="min-w-0">
                    <h2 className="text-lg font-black leading-none text-white">
                        Panel Admin
                    </h2>

                    <p className="mt-1 truncate text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                        {businessName || businessSlug}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white shadow-[0_12px_30px_rgba(0,0,0,0.25)] transition active:scale-95"
                    aria-label="Abrir menú"
                >
                    <Menu className="h-5 w-5" />
                </button>
            </div>

            {open && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
                        onClick={() => setOpen(false)}
                        aria-label="Cerrar menú"
                    />

                    <aside className="absolute left-0 top-0 flex h-full w-[86%] max-w-[340px] flex-col border-r border-white/10 bg-[#0f1115] shadow-2xl">
                        <div className="shrink-0 border-b border-white/10 px-5 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div
                                        className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-black text-[#0f1115]"
                                        style={{ backgroundColor: PRIMARY }}
                                    >
                                        {businessName?.slice(0, 1).toUpperCase() || 'A'}
                                    </div>

                                    <h2 className="font-display text-3xl leading-none tracking-wide text-white">
                                        Panel Admin
                                    </h2>

                                    <p className="mt-1 truncate text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                                        {businessName || businessSlug}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition active:scale-95"
                                    aria-label="Cerrar menú"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto py-4">
                            <NavLinks
                                pathname={pathname}
                                businessSlug={businessSlug}
                                role={role}
                                onNavigate={() => setOpen(false)}
                            />
                        </div>

                        <div className="shrink-0 border-t border-white/10 p-4">
                            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-slate-300">
                                <LogOut className="h-[18px] w-[18px] text-slate-500" />
                                <AdminLogoutButton />
                            </div>
                        </div>
                    </aside>
                </div>
            )}

            <aside className="hidden border-r border-white/10 bg-[#0f1115] md:fixed md:left-0 md:top-0 md:flex md:h-screen md:w-[248px] md:flex-col">
                <div className="shrink-0 px-5 py-5">
                    <div
                        className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-[#0f1115] shadow-[0_12px_28px_rgba(200,148,46,0.18)]"
                        style={{ backgroundColor: PRIMARY }}
                    >
                        {businessName?.slice(0, 1).toUpperCase() || 'A'}
                    </div>

                    <h2 className="text-lg font-black leading-none text-white">
                        Panel Admin
                    </h2>

                    <p className="mt-2 truncate text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                        {businessName || businessSlug}
                    </p>
                </div>

                <div className="admin-sidebar-scroll min-h-0 flex-1 overflow-y-auto pb-4">
                    <NavLinks
                        pathname={pathname}
                        businessSlug={businessSlug}
                        role={role}
                    />
                </div>

                <div className="shrink-0 border-t border-white/10 p-3">
                    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-400 transition hover:bg-white/[0.05] hover:text-white">
                        <LogOut className="h-4 w-4 text-slate-500" />
                        <AdminLogoutButton />
                    </div>
                </div>
            </aside>
        </>
    )
}