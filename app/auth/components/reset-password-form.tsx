'use client'

import {
    useState,
} from 'react'

import Link from 'next/link'

import {
    CheckCircle2,
    Eye,
    EyeOff,
    LockKeyhole,
} from 'lucide-react'

import {
    createClient,
} from '@/src/lib/supabase/browser'

type ResetPasswordFormProps = {
    email?: string | null
}

export function ResetPasswordForm({
    email,
}: ResetPasswordFormProps) {
    const supabase =
        createClient()

    const [
        password,
        setPassword,
    ] = useState('')

    const [
        passwordConfirmation,
        setPasswordConfirmation,
    ] = useState('')

    const [
        showPassword,
        setShowPassword,
    ] = useState(false)

    const [
        loading,
        setLoading,
    ] = useState(false)

    const [
        errorMessage,
        setErrorMessage,
    ] = useState('')

    const [
        completed,
        setCompleted,
    ] = useState(false)

    async function handleSubmit(
        event:
            React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault()

        if (loading) return

        setErrorMessage('')

        if (password.length < 8) {
            setErrorMessage(
                'La contraseña debe tener al menos 8 caracteres.'
            )
            return
        }

        if (
            password !==
            passwordConfirmation
        ) {
            setErrorMessage(
                'Las contraseñas no coinciden.'
            )
            return
        }

        setLoading(true)

        try {
            const {
                error,
            } =
                await supabase.auth.updateUser({
                    password,
                })

            if (error) {
                throw error
            }

            /*
             * Cerramos la sesión temporal de
             * recuperación. El usuario deberá entrar
             * nuevamente con la contraseña nueva.
             */
            await supabase.auth.signOut()

            setCompleted(true)
        } catch (error) {
            console.error(
                'Error actualizando contraseña:',
                error
            )

            setErrorMessage(
                'No se pudo cambiar la contraseña. El enlace puede haber expirado.'
            )
        } finally {
            setLoading(false)
        }
    }

    if (completed) {
        return (
            <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-8 w-8" />
                </div>

                <h2 className="mt-5 text-2xl font-black text-slate-950">
                    Contraseña actualizada
                </h2>

                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    Ya puedes iniciar sesión con tu nueva contraseña.
                </p>

                <Link
                    href="/admin/login"
                    className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white transition hover:brightness-105 active:scale-[0.98]"
                >
                    Volver al inicio de sesión
                </Link>
            </div>
        )
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-4"
        >
            {email && (
                <div className="rounded-2xl border border-black/10 bg-[#F4EFE5] px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                        Cuenta
                    </p>

                    <p className="mt-1 break-all text-sm font-black text-slate-700">
                        {email}
                    </p>
                </div>
            )}

            {errorMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {errorMessage}
                </div>
            )}

            <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Nueva contraseña
                </span>

                <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                        type={
                            showPassword
                                ? 'text'
                                : 'password'
                        }
                        value={password}
                        onChange={(event) =>
                            setPassword(
                                event.target.value
                            )
                        }
                        autoComplete="new-password"
                        minLength={8}
                        required
                        className="w-full rounded-2xl border border-black/10 bg-white py-4 pl-12 pr-12 text-sm font-bold text-slate-950 outline-none transition focus:border-[#C8942E] focus:ring-4 focus:ring-[#C8942E]/10"
                        placeholder="Mínimo 8 caracteres"
                    />

                    <button
                        type="button"
                        onClick={() =>
                            setShowPassword(
                                (current) =>
                                    !current
                            )
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                        aria-label={
                            showPassword
                                ? 'Ocultar contraseña'
                                : 'Mostrar contraseña'
                        }
                    >
                        {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                        ) : (
                            <Eye className="h-5 w-5" />
                        )}
                    </button>
                </div>
            </label>

            <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Confirmar contraseña
                </span>

                <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                        type={
                            showPassword
                                ? 'text'
                                : 'password'
                        }
                        value={
                            passwordConfirmation
                        }
                        onChange={(event) =>
                            setPasswordConfirmation(
                                event.target.value
                            )
                        }
                        autoComplete="new-password"
                        minLength={8}
                        required
                        className="w-full rounded-2xl border border-black/10 bg-white px-12 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-[#C8942E] focus:ring-4 focus:ring-[#C8942E]/10"
                        placeholder="Repite la contraseña"
                    />
                </div>
            </label>

            <button
                type="submit"
                disabled={loading}
                className="inline-flex h-13 w-full items-center justify-center rounded-2xl bg-[#C8942E] px-5 py-4 text-sm font-black text-white shadow-sm transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
                {loading
                    ? 'Actualizando...'
                    : 'Cambiar contraseña'}
            </button>
        </form>
    )
}