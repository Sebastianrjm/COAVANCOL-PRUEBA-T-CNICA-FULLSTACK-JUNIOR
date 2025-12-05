// Cliente simple para la API del backend
export type UpdateEstadoPayload = {
  asociadoId: string
  nuevoEstado: string
}

export async function updateEstadoPipeline(payload: UpdateEstadoPayload) {
  const res = await fetch('/api/updateEstadoPipeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await res.json() : { message: await res.text() }

  if (!res.ok) {
    // Estandarizo el error para el frontend
    const message = body && body.message ? body.message : `Error HTTP ${res.status}`
    const err: any = new Error(message)
    err.status = res.status
    err.body = body
    throw err
  }

  return body
}