'use client'

import {
    useMemo,
    useState,
} from 'react'
import {
    Eye,
    EyeOff,
    LockKeyhole,
} from 'lucide-react'
import { toast } from 'sonner'

import {
    createClient,
} from '@/src/lib/supabase/browser'

export function SetPasswordForm() {
    const supabase = useMemo(
        () => createClient(),
        []
    )

    const [
        password,
        setPassword,
    ] = useState('')

    const [
        confirmPassword,
        setConfirmPassword,
    ] = useState('')

    const [
        showPassword,
        setShowPassword,
    ] = useState(false)

    const [
        loading,
        setLoading,
    ] = useState(false)

    async function handleSubmit(
        event:
            React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault()

        if (loading) {
            return
        }

        if (password.length < 8) {
            toast.error(
                'La contraseña debe tener al menos 8 caracteres'
            )
            return
        }

        if (
            !/[a-z]/.test(password) ||
            !/[A-Z]/.test(password) ||
            !/[0-9]/.test(password)
        ) {
            toast.error(
                'Incluye una mayúscula, una minúscula y un número'
            )
            return
        }

        if (
            password !==
            confirmPassword
        ) {
            toast.error(
                'Las contraseñas no coinciden'
            )
            return
        }

        setLoading(true)

        try {
            const {
                error,
            } =
                await supabase.auth
                    .updateUser({
                        password,
                    })

            if (error) {
                console.error(
                    'Error creando contraseña:',
                    error
                )

                toast.error(
                    'No se pudo guardar la contraseña. La invitación puede haber vencido.'
                )
                return
            }

            toast.success(
                'Contraseña creada correctamente'
            )

            /*
             * Navegación completa para que el servidor
             * reciba la sesión actualizada.
             */
            window.location.assign(
                '/admin'
            )
        } catch (error) {
            console.error(
                'Error inesperado creando contraseña:',
                error
            )

            toast.error(
                'No se pudo crear la contraseña'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-5"
        >
            <div>
                <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-black text-slate-700"
                >
                    Nueva contraseña
                </label>

                <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                        id="password"
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
                        maxLength={72}
                        disabled={loading}
                        className="h-12 w-full rounded-2xl border border-black/10 bg-white pl-12 pr-12 text-sm font-bold text-slate-900 outline-none transition focus:border-[#C8942E] focus:ring-4 focus:ring-[#C8942E]/10 disabled:opacity-60"
                    />

                    <button
                        type="button"
                        onClick={() =>
                            setShowPassword(
                                (value) =>
                                    !value
                            )
                        }
                        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label={
                            showPassword
                                ? 'Ocultar contraseña'
                                : 'Mostrar contraseña'
                        }
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                    </button>
                </div>
            </div>

            <div>
                <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-black text-slate-700"
                >
                    Repetir contraseña
                </label>

                <input
                    id="confirmPassword"
                    type={
                        showPassword
                            ? 'text'
                            : 'password'
                    }
                    value={confirmPassword}
                    onChange={(event) =>
                        setConfirmPassword(
                            event.target.value
                        )
                    }
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={72}
                    disabled={loading}
                    className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-[#C8942E] focus:ring-4 focus:ring-[#C8942E]/10 disabled:opacity-60"
                />
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-bold leading-5 text-blue-800">
                Usa al menos 8 caracteres, una
                mayúscula, una minúscula y un número.
            </div>

            <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(200,148,46,0.24)] transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
                {loading
                    ? 'Guardando contraseña...'
                    : 'Crear contraseña y entrar'}
            </button>
        </form>
    )
}

