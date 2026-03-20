'use client'

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
} from 'lucide-react'
import { AdminLogoutButton } from '@/src/features/auth/components/admin-logout-button'

const links = [
    { href: '/admin/reservas', label: 'Reservas', icon: CalendarDays },
    { href: '/admin/servicios', label: 'Servicios', icon: Scissors },
    { href: '/admin/barberos', label: 'Barberos', icon: User },
    { href: '/admin/horarios', label: 'Horarios', icon: Clock3 },
    { href: '/admin/bloqueos', label: 'Bloqueos', icon: Ban },
    { href: '/admin/galeria', label: 'Galería', icon: ImageIcon },
    { href: '/admin/contenido', label: 'Contenido', icon: FileText },
    { href: '/admin/reviews', label: 'Reviews', icon: Star },
]

const PRIMARY = '#9a6a07'

export function AdminNav() {
    const pathname = usePathname()

    return (
        <aside className="w-full border-b border-[#ebe5d6] bg-[#f3f2ef] md:fixed md:left-0 md:top-0 md:h-screen md:w-[254px] md:border-b-0 md:border-r">
            <div className="flex h-full flex-col px-0 py-7">
                <div className="px-7">
                    <h2 className="text-[20px] font-bold leading-none text-[#1e1e1e]">
                        Panel Admin
                    </h2>
                    <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8a857a]">
                        Barberos Demo
                    </p>
                </div>

                <nav className="mt-10 flex flex-col">
                    {links.map((link) => {
                        const isActive = pathname === link.href
                        const Icon = link.icon

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex h-[56px] items-center gap-4 px-7 text-[15px] font-medium transition ${isActive
                                        ? 'bg-[#ece9e2] text-[#b15f12]'
                                        : 'text-[#403d39] hover:bg-[#ece9e2]'
                                    }`}
                                style={
                                    isActive
                                        ? { boxShadow: `inset 3px 0 0 0 ${PRIMARY}` }
                                        : undefined
                                }
                            >
                                <Icon className="h-[18px] w-[18px] stroke-[1.9]" />
                                <span>{link.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="mt-auto px-7 pt-10">
                    <div className="flex items-center gap-4 text-[15px] text-[#403d39]">
                        <LogOut className="h-[18px] w-[18px]" />
                        <AdminLogoutButton />
                    </div>
                </div>
            </div>
        </aside>
    )
}