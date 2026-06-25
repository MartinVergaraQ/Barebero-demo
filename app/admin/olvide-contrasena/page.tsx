'use client'

import {
    useState,
} from 'react'

import Link from 'next/link'

import {
    ArrowLeft,
    Mail,
    Send,
} from 'lucide-react'

import {
    createClient,
} from '@/src/lib/supabase/browser'

const PRIMARY =
    '#C8942E'

export default function ForgotPasswordPage() {
    const supabase =
        createClient()

    const [
        email,
        setEmail,
    ] = useState('')

    const [
        loading,
        setLoading,
    ] = useState(false)

    const [
        sent,
        setSent,
    ] = useState(false)

    async function handleSubmit(
        event:
            React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault()

        if (loading) return

        setLoading(true)

        const normalizedEmail =
            email
                .trim()
                .toLowerCase()

        try {
            const redirectTo =
                `${window.location.origin}/auth/confirm`

            const {
                error,
            } =
                await supabase.auth
                    .resetPasswordForEmail(
                        normalizedEmail,
                        {
                            redirectTo,
                        }
                    )

            /*
             * El usuario ve siempre el mismo mensaje.
             * No revelamos si el correo existe.
             */
            if (error) {
                console.error(
                    'Error solicitando recuperación:',
                    error
                )
            }

            setSent(true)
        } catch (error) {
            console.error(
                'Error inesperado solicitando recuperación:',
                error
            )

            setSent(true)
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
            <section className="w-full max-w-md overflow-hidden rounded-[30px] border border-white/10 bg-surface shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
                <header className="border-b border-white/10 px-6 py-6">
                    <Link
                        href="/admin/login"
                        className="inline-flex items-center gap-2 text-xs font-black text-slate-400 transition hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al login
                    </Link>

                    <p
                        className="mt-6 text-[10px] font-black uppercase tracking-[0.28em]"
                        style={{
                            color: PRIMARY,
                        }}
                    >
                        Recuperar acceso
                    </p>

                    <h1 className="mt-2 text-3xl font-black text-white">
                        ¿Olvidaste tu contraseña?
                    </h1>

                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                        Ingresa tu correo y te enviaremos un enlace para crear una contraseña nueva.
                    </p>
                </header>

                <div className="p-6">
                    {sent ? (
                        <div className="text-center">
                            <div
                                className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-[#0f1115]"
                                style={{
                                    backgroundColor:
                                        PRIMARY,
                                }}
                            >
                                <Send className="h-7 w-7" />
                            </div>

                            <h2 className="mt-5 text-xl font-black text-white">
                                Revisa tu correo
                            </h2>

                            <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                                Si existe una cuenta asociada a ese correo, recibirás un enlace para cambiar tu contraseña.
                            </p>

                            <Link
                                href="/admin/login"
                                className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-black text-white transition hover:bg-white/[0.09]"
                            >
                                Volver al login
                            </Link>
                        </div>
                    ) : (
                        <form
                            onSubmit={handleSubmit}
                            className="space-y-5"
                        >
                            <label className="block">
                                <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                                    Correo electrónico
                                </span>

                                <div className="relative">
                                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(event) =>
                                            setEmail(
                                                event.target.value
                                            )
                                        }
                                        autoComplete="email"
                                        required
                                        className="w-full rounded-2xl border border-white/10 bg-[#11141a] px-12 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-[rgba(200,148,46,0.7)] focus:shadow-[0_0_0_4px_rgba(200,148,46,0.12)]"
                                        placeholder="correo@email.com"
                                    />
                                </div>
                            </label>

                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex h-14 w-full items-center justify-center rounded-2xl px-5 text-sm font-black text-[#0f1115] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                                style={{
                                    backgroundColor:
                                        PRIMARY,
                                }}
                            >
                                {loading
                                    ? 'Enviando...'
                                    : 'Enviar enlace'}
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    )
}