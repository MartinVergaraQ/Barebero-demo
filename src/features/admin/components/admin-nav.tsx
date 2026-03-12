'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AdminLogoutButton } from '@/src/features/auth/components/admin-logout-button'

const links = [
    { href: '/admin/reservas', label: 'Reservas' },
    { href: '/admin/servicios', label: 'Servicios' },
    { href: '/admin/barberos', label: 'Barberos' },
    { href: '/admin/horarios', label: 'Horarios' },
    { href: '/admin/bloqueos', label: 'Bloqueos' },
]

export function AdminNav() {
    const pathname = usePathname()

    return (
        <aside className="w-full border-b bg-white p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
            <div className="mb-6">
                <h2 className="text-xl font-bold">Panel Admin</h2>
                <p className="text-sm text-gray-500">Barberos Demo</p>
            </div>

            <nav className="flex flex-col gap-2">
                {links.map((link) => {
                    const isActive = pathname === link.href

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`rounded-lg px-4 py-3 text-sm font-medium transition ${isActive
                                    ? 'bg-black text-white'
                                    : 'border text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {link.label}
                        </Link>
                    )
                })}
            </nav>

            <div className="mt-6">
                <AdminLogoutButton />
            </div>
        </aside>
    )
}