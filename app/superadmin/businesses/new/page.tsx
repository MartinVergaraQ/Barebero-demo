import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getPlatformAdmin } from '@/src/features/auth/api/get-platform-admin'
import { CreateBusinessForm } from '@/src/features/business/components/create-business-form'

export default async function NewBusinessPage() {
    const platformAdmin =
        await getPlatformAdmin()

    if (!platformAdmin) {
        redirect('/admin/login')
    }

    return (
        <main className="min-h-screen bg-[#F4EFE5] px-4 py-5 text-slate-950 md:px-8 md:py-7">
            <div className="mx-auto max-w-5xl">
                <header className="mb-5 border-b border-black/10 pb-5">
                    <Link
                        href="/superadmin/businesses"
                        className="text-xs font-black text-[#8A5D16] transition hover:text-[#C8942E]"
                    >
                        ← Volver a negocios
                    </Link>

                    <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-[#C8942E]">
                        Administración SaaS
                    </p>

                    <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                        Crear nuevo negocio
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                        Registra una barbería, configura su
                        plan inicial e invita a su propietario.
                    </p>
                </header>

                <CreateBusinessForm />
            </div>
        </main>
    )
}

