import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { getBusinessAdmin } from '@/src/features/business/api/get-business-admin'
import { AdminBusinessForm } from '@/src/features/business/components/admin-business-form'
import { canManageBusiness } from '@/src/features/auth/utils/admin-access'

type AdminNegocioPageProps = {
    params: Promise<{
        slug: string
    }>
}

export default async function AdminNegocioPage({
    params,
}: AdminNegocioPageProps) {
    const { slug } = await params
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

    if (profileError || !profile || !canManageBusiness(profile.role)) {
        redirect('/admin')
    }

    const business = await getBusinessBySlug(slug)

    if (profile.business_id !== business.id) {
        redirect('/admin')
    }

    const businessData = await getBusinessAdmin(business.id)

    const hasLogo = !!businessData.logo_url
    const hasCover = !!businessData.cover_url
    const hasWhatsApp = !!businessData.whatsapp_phone
    const hasAddress = !!businessData.address

    return (
        <main className="min-h-screen bg-[#F4EFE5] px-4 py-6 text-slate-950 md:px-8 md:py-8">
            <div className="mx-auto max-w-7xl space-y-6 md:space-y-8">
                <header className="flex flex-col gap-5 border-b border-black/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-500">
                            {business.name}
                        </p>

                        <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                            Negocio
                        </h1>

                        <p className="mt-2 max-w-[720px] text-sm leading-6 text-slate-600 md:text-base md:leading-7">
                            Administra los datos públicos del negocio: nombre, contacto, redes, dirección, imágenes y configuración general.
                        </p>
                    </div>

                    <div className="w-fit rounded-full bg-[#C8942E]/10 px-4 py-2 text-xs font-black text-[#8A5D16]">
                        Configuración general
                    </div>
                </header>

                <section className="grid gap-4 md:grid-cols-4">
                    <article className="rounded-[26px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                            Logo
                        </p>

                        <h2
                            className={`mt-3 text-2xl font-black ${hasLogo ? 'text-emerald-700' : 'text-slate-950'
                                }`}
                        >
                            {hasLogo ? 'Listo' : 'Pendiente'}
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Imagen principal del negocio.
                        </p>
                    </article>

                    <article className="rounded-[26px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                            Portada
                        </p>

                        <h2
                            className={`mt-3 text-2xl font-black ${hasCover ? 'text-emerald-700' : 'text-slate-950'
                                }`}
                        >
                            {hasCover ? 'Listo' : 'Pendiente'}
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Imagen hero del sitio público.
                        </p>
                    </article>

                    <article className="rounded-[26px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                            Contacto
                        </p>

                        <h2
                            className={`mt-3 text-2xl font-black ${hasWhatsApp ? 'text-emerald-700' : 'text-slate-950'
                                }`}
                        >
                            {hasWhatsApp ? 'Listo' : 'Pendiente'}
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            WhatsApp o datos de contacto.
                        </p>
                    </article>

                    <article className="rounded-[26px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                            Dirección
                        </p>

                        <h2
                            className={`mt-3 text-2xl font-black ${hasAddress ? 'text-emerald-700' : 'text-slate-950'
                                }`}
                        >
                            {hasAddress ? 'Listo' : 'Pendiente'}
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Ubicación pública del negocio.
                        </p>
                    </article>
                </section>

                <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                    <div className="border-b border-black/10 px-5 py-5 md:px-6">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                            Datos del negocio
                        </p>

                        <h2 className="mt-1 text-2xl font-black text-slate-950">
                            Configuración pública
                        </h2>

                        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                            Todo lo que configures aquí impacta cómo se ve el negocio en la página pública y en el flujo de reserva.
                        </p>
                    </div>

                    <div className="p-4 md:p-6">
                        <AdminBusinessForm business={businessData} />
                    </div>
                </section>
            </div>
        </main>
    )
}