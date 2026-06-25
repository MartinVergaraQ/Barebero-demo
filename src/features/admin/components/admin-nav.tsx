'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Ban,
    CalendarDays,
    Clock3,
    CreditCard,
    ImageIcon,
    LogOut,
    Menu,
    MoreHorizontal,
    Scissors,
    Settings,
    Star,
    User,
    UsersRound,
    X,
} from 'lucide-react'

import {
    AdminLogoutButton,
} from '@/src/features/auth/components/admin-logout-button'

import {
    canManageAppointments,
    canManageBusiness,
    canManageCatalog,
    canManageReviews,
} from '@/src/features/auth/utils/admin-access'

const PRIMARY = '#C8942E'

type NavItem = {
    href: string
    label: string
    shortLabel?: string
    icon: typeof CalendarDays
}

function isActiveRoute(
    pathname: string,
    href: string
) {
    return (
        pathname === href ||
        pathname.startsWith(
            `${href}/`
        )
    )
}

function buildLinks(
    slug: string,
    role: string
): NavItem[] {
    if (role === 'barber') {
        return [
            {
                href: '/admin/mi-agenda',
                label: 'Mi agenda',
                icon: CalendarDays,
            },
            {
                href: '/admin/mis-reservas',
                label: 'Mis reservas',
                icon: CalendarDays,
            },
            {
                href: '/admin/mi-perfil',
                label: 'Mi perfil',
                icon: User,
            },
            {
                href: `/admin/b/${slug}/horarios`,
                label: 'Mis horarios',
                icon: Clock3,
            },
            {
                href: `/admin/b/${slug}/bloqueos`,
                label: 'Mis bloqueos',
                icon: Ban,
            },
            {
                href: `/admin/b/${slug}/galeria`,
                label: 'Mi galería',
                icon: ImageIcon,
            },
        ]
    }

    const links: NavItem[] = []

    if (canManageAppointments(role)) {
        links.push({
            href: `/admin/b/${slug}/reservas`,
            label: 'Reservas',
            icon: CalendarDays,
        })

        links.push({
            href: `/admin/b/${slug}/horarios`,
            label: 'Horarios',
            icon: Clock3,
        })

        links.push({
            href: `/admin/b/${slug}/bloqueos`,
            label: 'Bloqueos',
            icon: Ban,
        })
    }

    if (canManageCatalog(role)) {
        links.push({
            href: `/admin/b/${slug}/servicios`,
            label: 'Servicios',
            icon: Scissors,
        })

        links.push({
            href: `/admin/b/${slug}/barberos`,
            label: 'Barberos',
            icon: User,
        })

        links.push({
            href: `/admin/b/${slug}/galeria`,
            label: 'Galería',
            icon: ImageIcon,
        })
    }

    if (canManageReviews(role)) {
        links.push({
            href: `/admin/b/${slug}/reviews`,
            label: 'Reviews',
            icon: Star,
        })
    }

    if (role === 'owner') {
        links.push({
            href: `/admin/b/${slug}/equipo`,
            label: 'Equipo',
            icon: UsersRound,
        })

        links.push({
            href: `/admin/b/${slug}/plan`,
            label: 'Plan',
            icon: CreditCard,
        })
    }

    if (canManageBusiness(role)) {
        links.push({
            href: `/admin/b/${slug}/negocio`,
            label: 'Negocio',
            icon: Settings,
        })
    }

    return links
}

function buildBarberBottomLinks(
    slug: string
): NavItem[] {
    return [
        {
            href: '/admin/mi-agenda',
            label: 'Mi agenda',
            shortLabel: 'Agenda',
            icon: CalendarDays,
        },
        {
            href: '/admin/mis-reservas',
            label: 'Mis reservas',
            shortLabel: 'Reservas',
            icon: CalendarDays,
        },
        {
            href: `/admin/b/${slug}/horarios`,
            label: 'Mis horarios',
            shortLabel: 'Horarios',
            icon: Clock3,
        },
        {
            href: `/admin/b/${slug}/bloqueos`,
            label: 'Mis bloqueos',
            shortLabel: 'Bloqueos',
            icon: Ban,
        },
    ]
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
    const links =
        buildLinks(
            businessSlug,
            role
        )

    return (
        <nav className="space-y-1 px-3">
            {links.map((link) => {
                const active =
                    isActiveRoute(
                        pathname,
                        link.href
                    )

                const Icon =
                    link.icon

                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        onClick={onNavigate}
                        className={`group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition duration-200 ${active
                            ? 'bg-[rgba(200,148,46,0.12)] text-white ring-1 ring-[rgba(200,148,46,0.24)]'
                            : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
                            }`}
                    >
                        {active && (
                            <span
                                className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full"
                                style={{
                                    backgroundColor:
                                        PRIMARY,
                                }}
                            />
                        )}

                        <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${active
                                ? 'bg-[rgba(200,148,46,0.18)] text-[#C8942E]'
                                : 'bg-white/[0.04] text-slate-500 group-hover:bg-white/[0.08] group-hover:text-slate-200'
                                }`}
                        >
                            <Icon className="h-4 w-4 stroke-[1.9]" />
                        </span>

                        <span className="truncate">
                            {link.label}
                        </span>
                    </Link>
                )
            })}
        </nav>
    )
}

function BarberMobileHeader({
    businessName,
    businessSlug,
}: {
    businessName?: string
    businessSlug: string
}) {
    return (
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-black/5 bg-[#F6F3E8]/92 px-4 backdrop-blur-xl md:hidden">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#C8942E] text-sm font-black text-[#171715] shadow-[0_8px_20px_rgba(200,148,46,0.22)]">
                    {businessName
                        ?.slice(0, 1)
                        .toUpperCase() ||
                        'B'}
                </span>

                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#A87408]">
                        Mi espacio
                    </p>

                    <p className="truncate text-sm font-black text-slate-950">
                        {businessName ||
                            businessSlug}
                    </p>
                </div>
            </div>

            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-700">
                Barbero
            </span>
        </header>
    )
}

function BarberBottomNavigation({
    pathname,
    businessSlug,
    moreOpen,
    onOpenMore,
}: {
    pathname: string
    businessSlug: string
    moreOpen: boolean
    onOpenMore: () => void
}) {
    const links =
        buildBarberBottomLinks(
            businessSlug
        )

    const moreIsActive =
        pathname ===
        '/admin/mi-perfil' ||
        isActiveRoute(
            pathname,
            `/admin/b/${businessSlug}/galeria`
        )

    return (
        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-black/10 bg-[#FFFCF7]/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-14px_40px_rgba(15,23,42,0.10)] backdrop-blur-xl md:hidden">
            <div className="mx-auto grid max-w-lg grid-cols-5 px-2">
                {links.map((link) => {
                    const active =
                        isActiveRoute(
                            pathname,
                            link.href
                        )

                    const Icon =
                        link.icon

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="group flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-1"
                        >
                            <span
                                className={`relative flex h-10 w-12 items-center justify-center rounded-2xl transition duration-200 ${active
                                    ? 'bg-[#C8942E] text-white shadow-[0_8px_18px_rgba(200,148,46,0.28)]'
                                    : 'text-slate-400 group-active:bg-[#F4E7C7] group-active:text-[#8A5D16]'
                                    }`}
                            >
                                <Icon className="h-5 w-5 stroke-[2]" />

                                {active && (
                                    <span className="absolute -top-1 h-1 w-5 rounded-full bg-[#F5D98A]" />
                                )}
                            </span>

                            <span
                                className={`max-w-full truncate text-[9px] font-black ${active
                                    ? 'text-[#8A5D16]'
                                    : 'text-slate-500'
                                    }`}
                            >
                                {link.shortLabel}
                            </span>
                        </Link>
                    )
                })}

                <button
                    type="button"
                    onClick={onOpenMore}
                    aria-expanded={
                        moreOpen
                    }
                    className="group flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-1"
                >
                    <span
                        className={`relative flex h-10 w-12 items-center justify-center rounded-2xl transition duration-200 ${moreIsActive ||
                            moreOpen
                            ? 'bg-[#C8942E] text-white shadow-[0_8px_18px_rgba(200,148,46,0.28)]'
                            : 'text-slate-400 group-active:bg-[#F4E7C7] group-active:text-[#8A5D16]'
                            }`}
                    >
                        <MoreHorizontal className="h-5 w-5 stroke-[2]" />

                        {(moreIsActive ||
                            moreOpen) && (
                                <span className="absolute -top-1 h-1 w-5 rounded-full bg-[#F5D98A]" />
                            )}
                    </span>

                    <span
                        className={`text-[9px] font-black ${moreIsActive ||
                            moreOpen
                            ? 'text-[#8A5D16]'
                            : 'text-slate-500'
                            }`}
                    >
                        Más
                    </span>
                </button>
            </div>
        </nav>
    )
}

function BarberMoreSheet({
    businessSlug,
    businessName,
    pathname,
    onClose,
}: {
    businessSlug: string
    businessName?: string
    pathname: string
    onClose: () => void
}) {
    const items: NavItem[] = [
        {
            href: '/admin/mi-perfil',
            label: 'Mi perfil',
            icon: User,
        },
        {
            href: `/admin/b/${businessSlug}/galeria`,
            label: 'Mi galería',
            icon: ImageIcon,
        },
    ]

    return (
        <div className="fixed inset-0 z-[80] md:hidden">
            <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar opciones"
                className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            />

            <section className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[30px] border-t border-black/10 bg-[#FFFCF7] pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-25px_70px_rgba(15,23,42,0.24)]">
                <div className="flex justify-center py-3">
                    <span className="h-1.5 w-12 rounded-full bg-slate-300" />
                </div>

                <header className="border-b border-black/5 px-5 pb-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#A87408]">
                        Tu cuenta
                    </p>

                    <h2 className="mt-1 text-xl font-black text-slate-950">
                        Más opciones
                    </h2>

                    <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                        {businessName ||
                            businessSlug}
                    </p>
                </header>

                <div className="space-y-2 p-4">
                    {items.map((item) => {
                        const active =
                            isActiveRoute(
                                pathname,
                                item.href
                            )

                        const Icon =
                            item.icon

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 transition ${active
                                    ? 'border-[#D6B76C] bg-[#FFF3D2] text-[#7A4F0D]'
                                    : 'border-black/5 bg-white text-slate-700 active:bg-[#F8F4EA]'
                                    }`}
                            >
                                <span
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${active
                                        ? 'bg-[#C8942E] text-white'
                                        : 'bg-[#F4EFE5] text-[#8A5D16]'
                                        }`}
                                >
                                    <Icon className="h-5 w-5" />
                                </span>

                                <span className="text-sm font-black">
                                    {item.label}
                                </span>
                            </Link>
                        )
                    })}

                    <div className="mt-3 flex min-h-14 items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 text-sm font-black text-red-700">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                            <LogOut className="h-5 w-5" />
                        </span>

                        <AdminLogoutButton />
                    </div>
                </div>
            </section>
        </div>
    )
}

function getPanelTitle(
    role: string
) {
    if (role === 'owner') {
        return 'Panel Propietario'
    }

    if (role === 'admin') {
        return 'Panel Admin'
    }

    if (role === 'barber') {
        return 'Panel Barbero'
    }

    return 'Panel'
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
    const pathname =
        usePathname()

    const [
        open,
        setOpen,
    ] = useState(false)

    const [
        barberMoreOpen,
        setBarberMoreOpen,
    ] = useState(false)

    const isBarber =
        role === 'barber'

    const panelTitle =
        getPanelTitle(role)

    return (
        <>
            {isBarber ? (
                <BarberMobileHeader
                    businessName={
                        businessName
                    }
                    businessSlug={
                        businessSlug
                    }
                />
            ) : (
                <div className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-white/10 bg-[#0F1115]/95 px-5 backdrop-blur md:hidden">
                    <div className="min-w-0">
                        <h2 className="text-lg font-black leading-none text-white">
                            {panelTitle}
                        </h2>

                        <p className="mt-1 truncate text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                            {businessName ||
                                businessSlug}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setOpen(true)
                        }
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white shadow-[0_12px_30px_rgba(0,0,0,0.25)] transition active:scale-95"
                        aria-label="Abrir menú"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                </div>
            )}

            {!isBarber && open && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
                        onClick={() =>
                            setOpen(false)
                        }
                        aria-label="Cerrar menú"
                    />

                    <aside className="absolute left-0 top-0 flex h-full w-[86%] max-w-[340px] flex-col border-r border-white/10 bg-[#0F1115] shadow-2xl">
                        <div className="shrink-0 border-b border-white/10 px-5 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div
                                        className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-black text-[#0F1115]"
                                        style={{
                                            backgroundColor:
                                                PRIMARY,
                                        }}
                                    >
                                        {businessName
                                            ?.slice(
                                                0,
                                                1
                                            )
                                            .toUpperCase() ||
                                            'A'}
                                    </div>

                                    <h2 className="text-3xl font-black leading-none tracking-wide text-white">
                                        {panelTitle}
                                    </h2>

                                    <p className="mt-1 truncate text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                                        {businessName ||
                                            businessSlug}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setOpen(
                                            false
                                        )
                                    }
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition active:scale-95"
                                    aria-label="Cerrar menú"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto py-4">
                            <NavLinks
                                pathname={
                                    pathname
                                }
                                businessSlug={
                                    businessSlug
                                }
                                role={role}
                                onNavigate={() =>
                                    setOpen(
                                        false
                                    )
                                }
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

            <aside className="hidden border-r border-white/10 bg-[#0F1115] md:fixed md:left-0 md:top-0 md:flex md:h-screen md:w-[248px] md:flex-col">
                <div className="shrink-0 px-5 py-5">
                    <div
                        className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-[#0F1115] shadow-[0_12px_28px_rgba(200,148,46,0.18)]"
                        style={{
                            backgroundColor:
                                PRIMARY,
                        }}
                    >
                        {businessName
                            ?.slice(0, 1)
                            .toUpperCase() ||
                            'A'}
                    </div>

                    <h2 className="text-lg font-black leading-none text-white">
                        {panelTitle}
                    </h2>

                    <p className="mt-2 truncate text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                        {businessName ||
                            businessSlug}
                    </p>
                </div>

                <div className="admin-sidebar-scroll min-h-0 flex-1 overflow-y-auto pb-4">
                    <NavLinks
                        pathname={pathname}
                        businessSlug={
                            businessSlug
                        }
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

            {isBarber && (
                <BarberBottomNavigation
                    pathname={pathname}
                    businessSlug={
                        businessSlug
                    }
                    moreOpen={
                        barberMoreOpen
                    }
                    onOpenMore={() =>
                        setBarberMoreOpen(
                            true
                        )
                    }
                />
            )}

            {isBarber &&
                barberMoreOpen && (
                    <BarberMoreSheet
                        pathname={
                            pathname
                        }
                        businessSlug={
                            businessSlug
                        }
                        businessName={
                            businessName
                        }
                        onClose={() =>
                            setBarberMoreOpen(
                                false
                            )
                        }
                    />
                )}
        </>
    )
}
