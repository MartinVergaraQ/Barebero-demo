import { supabase } from '@/src/lib/supabase/client'

export type SiteContentItem = {
    id: string
    business_id: string
    key: string
    value_json: unknown
}

export async function getSiteContent() {
    const { data, error } = await supabase
        .from('site_content')
        .select('id, business_id, key, value_json')

    if (error) {
        throw new Error(error.message)
    }

    return (data ?? []) as SiteContentItem[]
}

export async function getSiteContentMap() {
    const items = await getSiteContent()

    return items.reduce<Record<string, unknown>>((acc, item) => {
        acc[item.key] = item.value_json
        return acc
    }, {})
}