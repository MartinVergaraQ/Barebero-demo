import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'

export default async function AdminPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/admin/login')
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', user.id)
        .single()

    if (profileError || !profile?.business_id) {
        return (
            <main className="min-h-screen bg-[#f6f3e8] p-8 text-[#1f1f1f]">
                <div className="mx-auto max-w-2xl rounded-xl border bg-white p-6 shadow-sm">
                    <h1 className="text-3xl font-bold">Admin</h1>
                    <p className="mt-3 text-slate-600">
                        Tu usuario no tiene un negocio asignado todavía.
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                        Asigna un <code>business_id</code> en profiles para este usuario.
                    </p>
                </div>
            </main>
        )
    }

    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, slug')
        .eq('id', profile.business_id)
        .single()

    if (businessError || !business) {
        return (
            <main className="min-h-screen bg-[#f6f3e8] p-8 text-[#1f1f1f]">
                <div className="mx-auto max-w-2xl rounded-xl border bg-white p-6 shadow-sm">
                    <h1 className="text-3xl font-bold">Admin</h1>
                    <p className="mt-3 text-slate-600">
                        El negocio asociado a tu usuario no fue encontrado.
                    </p>
                    <div className="mt-6">
                        <Link
                            href="/admin/login"
                            className="inline-flex rounded-lg border px-4 py-2"
                        >
                            Volver al login
                        </Link>
                    </div>
                </div>
            </main>
        )
    }

    redirect(`/admin/b/${business.slug}`)
}