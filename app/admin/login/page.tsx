'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/browser'
import { LockKeyhole, Mail, ShieldCheck, ArrowRight } from 'lucide-react'

const PRIMARY = '#C8942E'

export default function AdminLoginPage() {
    const router = useRouter()
    const supabase = createClient()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setErrorMessage('')

        try {
            const { data: signInData, error: signInError } =
                await supabase.auth.signInWithPassword({
                    email,
                    password,
                })

            if (signInError) {
                throw new Error('Email o contraseña incorrectos')
            }

            const userId = signInData.user?.id

            if (!userId) {
                throw new Error('No se pudo obtener el usuario autenticado')
            }

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('business_id, role')
                .eq('id', userId)
                .single()

            if (profileError || !profile) {
                throw new Error('No se encontró el perfil del administrador')
            }

            if (!['owner', 'admin', 'barber'].includes(profile.role)) {
                throw new Error('No tienes permisos para entrar al panel admin')
            }

            const { data: business, error: businessError } = await supabase
                .from('businesses')
                .select('slug')
                .eq('id', profile.business_id)
                .single()

            if (businessError || !business?.slug) {
                throw new Error('No se encontró el negocio asociado a este admin')
            }

            if (profile.role === 'barber') {
                router.push('/admin/mi-agenda')
                router.refresh()
                return
            }

            router.push(`/admin/b/${business.slug}/reservas`)
            router.refresh()
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'No se pudo iniciar sesión'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="relative flex min-h-screen overflow-hidden bg-background text-foreground">
            <div className="pointer-events-none absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-[rgba(200,148,46,0.18)] blur-3xl" />
            <div className="pointer-events-none absolute bottom-[-160px] right-[-120px] h-[360px] w-[360px] rounded-full bg-white/[0.06] blur-3xl" />

            <section className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-5 py-8 md:grid-cols-[0.9fr_1fr] md:px-8 lg:px-10">
                <div className="hidden md:block">
                    <div
                        className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-black text-[#0f1115] shadow-[0_18px_45px_rgba(200,148,46,0.24)]"
                        style={{ backgroundColor: PRIMARY }}
                    >
                        A
                    </div>

                    <p
                        className="text-xs font-black uppercase tracking-[0.28em]"
                        style={{ color: PRIMARY }}
                    >
                        Panel administrativo
                    </p>

                    <h1 className="mt-4 max-w-md text-5xl font-black leading-[0.95] tracking-tight text-white lg:text-6xl">
                        Gestiona tu barbería con estilo.
                    </h1>

                    <p className="mt-5 max-w-md text-base leading-7 text-slate-400">
                        Accede a reservas, horarios, servicios, barberos, galería y configuración
                        desde un panel moderno y profesional.
                    </p>

                    <div className="mt-8 grid max-w-md gap-3">
                        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-slate-300">
                                <ShieldCheck className="h-5 w-5" />
                            </div>

                            <div>
                                <p className="text-sm font-black text-white">
                                    Acceso seguro
                                </p>
                                <p className="text-xs text-slate-500">
                                    Solo administradores autorizados.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-slate-300">
                                <LockKeyhole className="h-5 w-5" />
                            </div>

                            <div>
                                <p className="text-sm font-black text-white">
                                    Panel privado
                                </p>
                                <p className="text-xs text-slate-500">
                                    Control completo de tu negocio.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mx-auto w-full max-w-md">
                    <div className="mb-6 text-center md:hidden">
                        <div
                            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-black text-[#0f1115] shadow-[0_18px_45px_rgba(200,148,46,0.24)]"
                            style={{ backgroundColor: PRIMARY }}
                        >
                            A
                        </div>

                        <p
                            className="text-xs font-black uppercase tracking-[0.26em]"
                            style={{ color: PRIMARY }}
                        >
                            Panel administrativo
                        </p>

                        <h1 className="mt-3 text-4xl font-black leading-none text-white">
                            Bienvenido
                        </h1>
                    </div>

                    <div className="overflow-hidden rounded-[30px] border border-white/10 bg-surface shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
                        <div
                            className="relative px-5 py-6 md:px-7 md:py-7"
                            style={{
                                background:
                                    'radial-gradient(circle at top right, rgba(200,148,46,0.16), transparent 34%), linear-gradient(135deg, rgba(23,26,33,0.98), rgba(15,17,21,0.96))',
                            }}
                        >
                            <p
                                className="text-[10px] font-black uppercase tracking-[0.28em]"
                                style={{ color: PRIMARY }}
                            >
                                Acceso admin
                            </p>

                            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                                Inicia sesión
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                Entra con tus credenciales para administrar tu barbería.
                            </p>

                            {errorMessage && (
                                <div className="mt-5 rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm font-bold leading-5 text-red-200">
                                    {errorMessage}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                                <label className="block">
                                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                                        Email
                                    </span>

                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full rounded-2xl border border-white/10 bg-[#11141a] px-12 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-[rgba(200,148,46,0.7)] focus:shadow-[0_0_0_4px_rgba(200,148,46,0.12)]"
                                            placeholder="admin@email.com"
                                            autoComplete="email"
                                            required
                                        />
                                    </div>
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                                        Contraseña
                                    </span>

                                    <div className="relative">
                                        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full rounded-2xl border border-white/10 bg-[#11141a] px-12 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-[rgba(200,148,46,0.7)] focus:shadow-[0_0_0_4px_rgba(200,148,46,0.12)]"
                                            placeholder="••••••••"
                                            autoComplete="current-password"
                                            required
                                        />
                                    </div>
                                </label>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group mt-2 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black text-[#0f1115] shadow-[0_16px_36px_rgba(200,148,46,0.24)] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                                    style={{ backgroundColor: PRIMARY }}
                                >
                                    {loading ? 'Entrando...' : 'Entrar al panel'}

                                    {!loading && (
                                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                                    )}
                                </button>
                            </form>
                        </div>

                        <div className="border-t border-white/10 bg-white/[0.03] px-5 py-4 text-center md:px-7">
                            <p className="text-xs font-medium leading-5 text-slate-500">
                                Si no tienes acceso, solicita una cuenta al dueño del negocio.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    )
}