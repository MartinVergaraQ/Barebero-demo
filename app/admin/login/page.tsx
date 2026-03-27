'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/browser'

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
                throw new Error(signInError.message)
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
        <main className="mx-auto max-w-md p-8">
            <h1 className="mb-6 text-3xl font-bold">Login admin</h1>

            {errorMessage && (
                <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
                    {errorMessage}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="mb-2 block font-medium">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-lg border p-3"
                        placeholder="admin@email.com"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-lg border p-3"
                        placeholder="********"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-black px-4 py-3 text-white disabled:opacity-50"
                >
                    {loading ? 'Entrando...' : 'Entrar'}
                </button>
            </form>
        </main>
    )
}