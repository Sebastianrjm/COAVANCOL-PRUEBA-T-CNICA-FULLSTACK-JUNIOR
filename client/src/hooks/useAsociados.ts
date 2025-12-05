import { useEffect, useState, useCallback } from 'react'
import type { Asociado } from '../types'

const DEFAULT_PUBLIC_JSON_URL = 'https://raw.githubusercontent.com/managerrojo/COAVANCOL-Prueba-T-cn%20ica-/refs/heads/main/IndexAsociados'

export function useAsociados(publicJsonUrl?: string) {
  const url = publicJsonUrl || DEFAULT_PUBLIC_JSON_URL
  const [data, setData] = useState<Asociado[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAsociados = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Primero intento la URL pública (posible recurso externo)
      const res = await fetch(url)
      if (!res.ok) {
        // si falla, intento el endpoint local `/api/asociados`
        const localRes = await fetch('/api/asociados')
        if (!localRes.ok) throw new Error(`Error al obtener asociados (local): ${localRes.status}`)
        const localJson = await localRes.json()
        setData(sortByNombre(localJson))
      } else {
        const json = await res.json()
        setData(sortByNombre(json))
      }
    } catch (err: any) {
      setError(err.message || 'Error desconocido al leer asociados')
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    fetchAsociados()
  }, [fetchAsociados])

  function sortByNombre(arr: Asociado[]) {
    return [...arr].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', undefined, { sensitivity: 'base' }))
  }

  return { data, loading, error, refresh: fetchAsociados }
}