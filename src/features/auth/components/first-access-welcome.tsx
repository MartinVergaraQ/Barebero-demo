'use client'
import { useState, } from 'react'
import { CalendarDays, Check, Clock3, Sparkles, UserRound, } from 'lucide-react'
import { toast } from 'sonner'
import { markWelcomeSeenServer, } from '@/src/features/auth/api/mark-welcome-seen-server'
type FirstAccessWelcomeProps = {
    firstName: string
    businessName: string
}

export function FirstAccessWelcome({
    firstName,
    businessName,
}: FirstAccessWelcomeProps) {
    const [visible, setVisible,] = useState(true)
    const [closing, setClosing,] = useState(false)

    async function handleContinue() {
        if (closing) {
            return
        }
        setClosing(true)
        try {
            const result = await markWelcomeSeenServer()
            if (!result.ok) {
                toast.error(result.message)
                return
            }
            setVisible(false)
        } catch (error) {
            console.error('Error cerrando bienvenida:', error)
            toast.error('No se pudo cerrar la bienvenida')
        } finally {
            setClosing(false)
        }
    }

    if (!visible) {
        return null
    }

    return (
        <section className="overflow-hidden rounded-[24px] border border-[#E4C67F] bg-gradient-to-br from-[#FFF9EA] via-white to-[#F6E7BE] shadow-[0_18px_48px_rgba(168,116,8,0.14)]">
            <div className="p-5 md:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#C8942E] text-white shadow-[0_12px_28px_rgba(200,148,46,0.28)]">
                            <Sparkles className="h-7 w-7" />
                        </span>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A87408]"> Tu acceso está listo </p>
                            <h2 className="mt-1 text-2xl font-black text-slate-950"> ¡Bienvenido, {firstName}! </h2>
                            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600"> Ya eres parte de {businessName}. Desde este panel podrás organizar tu jornada y revisar tus propias reservas. </p>
                        </div>
                    </div>
                    <button type="button" disabled={closing} onClick={handleContinue} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_10px_24px_rgba(200,148,46,0.24)] transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50" >
                        <Check className="h-4 w-4" /> {closing ? 'Guardando...' : 'Entendido, comenzar'}
                    </button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white/70 px-4 py-3">
                        <CalendarDays className="h-5 w-5 text-[#A87408]" />
                        <p className="text-xs font-black text-slate-700"> Revisa tus reservas </p>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white/70 px-4 py-3">
                        <Clock3 className="h-5 w-5 text-[#A87408]" />
                        <p className="text-xs font-black text-slate-700"> Configura tus horarios </p>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white/70 px-4 py-3">
                        <UserRound className="h-5 w-5 text-[#A87408]" />
                        <p className="text-xs font-black text-slate-700"> Completa tu perfil </p>
                    </div>
                </div>
            </div>
        </section>
    )
}