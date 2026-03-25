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
} from 'lucide-react'
import { AdminLogoutButton } from '@/src/features/auth/components/admin-logout-button'
import {
    canManageAppointments,
    canManageBusiness,
    canManageCatalog,
    canManageReviews,
} from '@/src/features/auth/utils/admin-access'

const PRIMARY = '#a87408'

function buildLinks(slug: string, role: string) {
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
        links.push({ href: `/admin/b/${slug}/contenido`, label: 'Contenido', icon: FileText })
    }

    if (canManageReviews(role)) {
        links.push({ href: `/admin/b/${slug}/reviews`, label: 'Reviews', icon: Star })
    }

    if (canManageBusiness(role)) {
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
        <nav className="flex flex-col">
            {links.map((link) => {
                const isActive = pathname === link.href
                const Icon = link.icon

                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        onClick={onNavigate}
                        className={`flex h-[56px] items-center gap-4 px-6 text-[15px] font-medium transition ${isActive
                                ? 'bg-[#ece9e2] text-[#b15f12]'
                                : 'text-[#403d39] hover:bg-[#ece9e2]'
                            }`}
                        style={
                            isActive
                                ? { boxShadow: `inset 4px 0 0 0 ${PRIMARY}` }
                                : undefined
                        }
                    >
                        <Icon className="h-[18px] w-[18px] stroke-[1.8]" />
                        <span>{link.label}</span>
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
            <div className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-[#ebe5d6] bg-[#f3f2ef] px-5 md:hidden">
                <div>
                    <h2 className="text-[18px] font-bold leading-none text-[#1e1e1e]">
                        Panel Admin
                    </h2>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a857a]">
                        {businessName || businessSlug}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="flex h-11 w-11 items-center justify-center rounded-[8px] border border-[#ddd6c8] bg-white text-[#2c2a26]"
                    aria-label="Abrir menú"
                >
                    <Menu className="h-5 w-5" />
                </button>
            </div>

            {open && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/30"
                        onClick={() => setOpen(false)}
                        aria-label="Cerrar menú"
                    />

                    <aside className="absolute left-0 top-0 flex h-full w-[84%] max-w-[320px] flex-col bg-[#f3f2ef] shadow-xl">
                        <div className="flex items-start justify-between border-b border-[#ebe5d6] px-6 py-6">
                            <div>
                                <h2 className="text-[20px] font-bold leading-none text-[#1e1e1e]">
                                    Panel Admin
                                </h2>
                                <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8a857a]">
                                    {businessName || businessSlug}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#ddd6c8] bg-white text-[#2c2a26]"
                                aria-label="Cerrar menú"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="py-3">
                            <NavLinks
                                pathname={pathname}
                                businessSlug={businessSlug}
                                role={role}
                                onNavigate={() => setOpen(false)}
                            />
                        </div>

                        <div className="mt-auto border-t border-[#ebe5d6] px-6 py-5">
                            <div className="flex items-center gap-3 text-[15px] text-[#403d39]">
                                <LogOut className="h-[18px] w-[18px]" />
                                <AdminLogoutButton />
                            </div>
                        </div>
                    </aside>
                </div>
            )}

            <aside className="hidden border-r border-[#ebe5d6] bg-[#f3f2ef] md:fixed md:left-0 md:top-0 md:flex md:h-screen md:w-[254px] md:flex-col">
                <div className="px-7 py-7">
                    <h2 className="text-[20px] font-bold leading-none text-[#1e1e1e]">
                        Panel Admin
                    </h2>
                    <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8a857a]">
                        {businessName || businessSlug}
                    </p>
                </div>

                <div className="mt-2">
                    <NavLinks
                        pathname={pathname}
                        businessSlug={businessSlug}
                        role={role}
                    />
                </div>

                <div className="mt-auto px-7 py-7">
                    <div className="flex items-center gap-4 text-[15px] text-[#403d39]">
                        <LogOut className="h-[18px] w-[18px]" />
                        <AdminLogoutButton />
                    </div>
                </div>
            </aside>
        </>
    )
}