import { redirect } from 'next/navigation'

import { createClient } from '@/src/lib/supabase/server'
import { SetPasswordForm } from '@/src/features/auth/components/set-password-form'

export default async function SetPasswordPage() {
    const supabase =
        await createClient()

    const {
        data: {
            user,
        },
        error,
    } = await supabase.auth.getUser()

    if (error || !user) {
        redirect(
            '/admin/login?error=invalid_invitation'
        )
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F4EFE5] px-4 py-10">
            <section className="w-full max-w-md overflow-hidden rounded-[30px] border border-black/10 bg-[#FFFCF4] shadow-[0_28px_80px_rgba(15,23,42,0.16)]">
                <header className="border-b border-black/10 px-6 py-6 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C8942E]">
                        Invitación aceptada
                    </p>

                    <h1 className="mt-2 text-3xl font-black text-slate-950">
                        Crea tu contraseña
                    </h1>

                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                        Define la contraseña que utilizarás
                        para entrar al panel de tu barbería.
                    </p>

                    {user.email && (
                        <p className="mt-3 rounded-xl bg-[#F4EFE5] px-3 py-2 text-xs font-black text-slate-600">
                            {user.email}
                        </p>
                    )}
                </header>

                <div className="p-6">
                    <SetPasswordForm />
                </div>
            </section>
        </main>
    )
}

