'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/browser'

export function AdminLogoutButton() {
    const router = useRouter()
    const supabase = createClient()

    async function handleLogout() {
        await supabase.auth.signOut()
        router.push('/admin/login')
        router.refresh()
    }

    return (
        <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border px-4 py-2"
        >
            Cerrar sesión
        </button>
    )
}