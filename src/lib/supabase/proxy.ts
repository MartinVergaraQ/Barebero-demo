import { createServerClient } from '@supabase/ssr'
import {
    NextResponse,
    type NextRequest,
} from 'next/server'

export async function updateSession(
    request: NextRequest
) {
    let supabaseResponse =
        NextResponse.next({
            request,
        })

    const supabase =
        createServerClient(
            process.env
                .NEXT_PUBLIC_SUPABASE_URL!,
            process.env
                .NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },

                    setAll(
                        cookiesToSet,
                        headers: Record<
                            string,
                            string
                        > = {}
                    ) {
                        /*
                         * Entrega inmediatamente los tokens
                         * renovados a Server Components.
                         */
                        cookiesToSet.forEach(
                            ({
                                name,
                                value,
                            }) => {
                                request.cookies.set(
                                    name,
                                    value
                                )
                            }
                        )

                        supabaseResponse =
                            NextResponse.next({
                                request,
                            })

                        /*
                         * Entrega las cookies nuevas
                         * también al navegador.
                         */
                        cookiesToSet.forEach(
                            ({
                                name,
                                value,
                                options,
                            }) => {
                                supabaseResponse.cookies.set(
                                    name,
                                    value,
                                    options
                                )
                            }
                        )

                        Object.entries(
                            headers
                        ).forEach(
                            ([name, value]) => {
                                supabaseResponse.headers.set(
                                    name,
                                    value
                                )
                            }
                        )
                    },
                },
            }
        )

    /*
     * No agregues consultas entre la creación
     * del cliente y esta validación.
     */
    await supabase.auth.getClaims()

    return supabaseResponse
}
