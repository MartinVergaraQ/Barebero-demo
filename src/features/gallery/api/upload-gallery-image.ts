export async function uploadGalleryImage(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload/gallery-image', {
        method: 'POST',
        body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
        throw new Error(data.error || 'Error subiendo imagen')
    }

    return data as {
        secure_url: string
        public_id: string
    }
}