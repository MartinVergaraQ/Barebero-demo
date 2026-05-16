'use client'

const PRIMARY = '#B7791F'

export function ReservationConfirmingLoading() {
    return (
        <section className="mx-auto max-w-3xl px-4 py-6 md:px-6 lg:px-8">
            <div className="overflow-hidden rounded-[32px] border border-emerald-100 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <div className="bg-gradient-to-r from-emerald-50 via-white to-amber-50 px-6 py-8 md:px-8">
                    <div className="flex flex-col items-center text-center">
                        <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
                            <span className="absolute inline-flex h-16 w-16 animate-ping rounded-full bg-emerald-100 opacity-75" />
                            <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full border border-emerald-200 bg-white shadow-sm">
                                <svg
                                    className="h-7 w-7 animate-spin"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="9"
                                        stroke="#D1D5DB"
                                        strokeWidth="2"
                                    />
                                    <path
                                        d="M21 12a9 9 0 0 1-9 9"
                                        stroke={PRIMARY}
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </span>
                        </div>

                        <p
                            className="text-xs font-black uppercase tracking-[0.28em]"
                            style={{ color: PRIMARY }}
                        >
                            Confirmando reserva
                        </p>

                        <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                            Estamos guardando tu cita
                        </h2>

                        <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500 md:text-base">
                            Esto tarda solo unos segundos. Estamos registrando tu hora
                            y preparando el resumen final.
                        </p>
                    </div>
                </div>

                <div className="px-6 pb-8 md:px-8">
                    <div className="rounded-[28px] border border-slate-100 bg-slate-50/80 p-5 shadow-inner">
                        <div className="animate-pulse space-y-4">
                            <div className="h-4 w-36 rounded-full bg-slate-200" />
                            <div className="h-10 w-64 rounded-2xl bg-slate-200" />
                            <div className="h-4 w-52 rounded-full bg-slate-200" />

                            <div className="pt-2 space-y-3">
                                <div className="h-14 rounded-2xl bg-white shadow-sm" />
                                <div className="h-14 rounded-2xl bg-white shadow-sm" />
                                <div className="h-14 rounded-2xl bg-white shadow-sm" />
                                <div className="h-20 rounded-[24px] bg-amber-100/70 shadow-sm" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-400">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                        <span>No cierres esta ventana</span>
                    </div>
                </div>
            </div>
        </section>
    )
}