import React, { useMemo, useState, useEffect } from 'react'
import { useAsociados } from '../hooks/useAsociados'
import type { Asociado } from '../types'
import { VALID_STATES, ALLOWED_TRANSITIONS } from '../constants'
import { updateEstadoPipeline } from '../api'


const FILTER_OPTIONS = [
  'Todos',
  'Prospecto',
  'Expediente en Construcción',
  'Pendiente Jurídico',
  'Pendiente Cierre de Crédito'
]

type Props = { publicJsonUrl?: string }

export default function AsociadosList({ publicJsonUrl }: Props) {
  const { data, loading, error, refresh } = useAsociados(publicJsonUrl)
  const [filter, setFilter] = useState<string>('Todos')

  // NUEVO ESTADO: Mapa para almacenar el estado de pago localmente
  const [aportePagoLocalMap, setAportePagoLocalMap] = useState<Record<string, boolean>>({})

  // Mapas de estado
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})
  const [errorMap, setErrorMap] = useState<Record<string, string>>({})
  const [successMap, setSuccessMap] = useState<Record<string, string>>({})

  // 1. Inicialización del estado local de pago al cargar los datos
  useEffect(() => {
    const initialMap: Record<string, boolean> = {}
    data.forEach(a => {
        const idKey = a.id || a.identificacion
        // Inicializamos el estado local. Si el campo existe en la data (aún si viene del backend), lo usa, si no, es false.
        initialMap[idKey] = a.aporte_49900_pagado === true 
    })
    setAportePagoLocalMap(initialMap)
  }, [data])


  const filtered = useMemo(() => {
    if (filter === 'Todos') return data
    return data.filter((a) => (a.estado_pipeline || '') === filter)
  }, [data, filter])

  function setRowLoading(id: string, v: boolean) {
    setLoadingMap((s) => ({ ...s, [id]: v }))
  }
  function setRowError(id: string, msg?: string) {
    setErrorMap((s) => ({ ...s, [id]: msg || '' }))
  }
  function setRowSuccess(id: string, msg?: string) {
    setSuccessMap((s) => ({ ...s, [id]: msg || '' }))
    if (msg) {
      setTimeout(() => {
        setSuccessMap((s) => ({ ...s, [id]: '' }))
      }, 3000)
    }
  }

  // 🔄 MODIFICADO: Maneja el cambio del estado de pago del aporte LOCALMENTE
  async function handleToggleAporte(asociado: Asociado, newValue: boolean) {
    const idKey = asociado.id || asociado.identificacion
    setRowError(idKey, '')
    setRowSuccess(idKey, '')
    setRowLoading(idKey, true)

    try {
      // ✅ MODIFICACIÓN CLAVE: Actualizar el estado local
      setAportePagoLocalMap((s) => ({ ...s, [idKey]: newValue }))
      
      setRowSuccess(idKey, `[LOCAL] Aporte establecido a: ${newValue ? 'Pagado' : 'Pendiente'}`)
      
      // Eliminamos la llamada a updateAporteStatus y await refresh().
    } catch (err: any) {
      // Manejo de error básico para el cambio de estado local
      const msg = err?.message || 'Error al actualizar el estado de pago del aporte localmente.'
      setRowError(idKey, msg)
    } finally {
      setRowLoading(idKey, false)
    }
  }

  async function handleChangeEstado(asociado: Asociado, nuevoEstado: string) {
    const idKey = asociado.id || asociado.identificacion || nuevoEstado
    setRowError(idKey, '')
    setRowSuccess(idKey, '')
    setRowLoading(idKey, true)

    try {
      // Obtener el estado de pago del MAPA LOCAL
      const isAportePagado = aportePagoLocalMap[idKey] === true

      // VALIDACIÓN DE LÓGICA DE NEGOCIO (usando el estado LOCAL)
      // CORRECCIÓN: Se lanza error si se intenta pasar a 'Pendiente Jurídico' Y NO está pagado.
      if (nuevoEstado === 'Pendiente Jurídico' && !isAportePagado) { // 👈 ¡CORREGIDO! Se añadió '!'
        throw new Error('No se puede avanzar a Pendiente Jurídico: el aporte de $49,900 debe estar pagado (Validación Local).')
      }

      const estadoActual = (asociado.estado_pipeline || '').trim()
      const allowed = ALLOWED_TRANSITIONS[estadoActual] || []
      
      if (nuevoEstado !== estadoActual) {
        if (allowed.length === 0) {
            throw new Error(`Transición inválida: Desde el estado "${estadoActual}" no hay transiciones permitidas.`)
        }
        if (nuevoEstado !== allowed[0]) {
            throw new Error(`Transición inválida. Solo se permite avanzar a: ${allowed[0]}`)
        }
      }

      // Llamada al backend para el cambio de estado del Pipeline (Esto sí sigue siendo responsabilidad del backend)
      await updateEstadoPipeline({ asociadoId: asociado.id || asociado.identificacion, nuevoEstado })
      setRowSuccess(idKey, 'Estado actualizado')
      // Actualizo la lista pidiendo refresh (fuente de verdad = backend, solo para el pipeline)
      await refresh()
    } catch (err: any) {
      const msg = err?.message || 'Error al actualizar'
      setRowError(idKey, msg)
    } finally {
      setRowLoading(idKey, false)
    }
  }

  return (
    <div className="container">
      <header>
        <h1>Listado de Asociados</h1>
        <div className="controls">
          <label>
            Filtrar estado:{' '}
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              {FILTER_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => refresh()}>Refrescar</button>
        </div>
      </header>

      {loading && <p className="info">Cargando asociados…</p>}
      {error && <p className="error">Error: {error}</p>}

      {!loading && !error && (
        <table className="asociados-table" aria-label="Tabla de asociados">
          <thead>
            <tr>
              <th>Id</th>
              <th>Nombre</th>
              <th>Identificación</th>
              <th>Estado Pipeline</th>
              <th>Aporte $49,900 Pagado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="info">
                  No hay asociados para mostrar
                </td>
              </tr>
            )}
            {filtered.map((a: Asociado) => {
              const key = a.id || a.identificacion
              const rowLoading = !!loadingMap[key]
              const rowError = errorMap[key]
              const rowSuccess = successMap[key]
              const estadoActual = a.estado_pipeline || ''

              // Lógica de Transición Secuencial Estricta para UX
              const allowedNextStep = ALLOWED_TRANSITIONS[estadoActual] ? [ALLOWED_TRANSITIONS[estadoActual][0]] : []
              const allowedLocal = [estadoActual, ...allowedNextStep].filter(s => s) 

              const isAportePagado = aportePagoLocalMap[key] === true

              return (
                <tr key={key}>
                  <td>{a.id}</td>
                  <td>{a.Nombre}</td>
                  <td>{a.Identificación}</td>
                  <td>{estadoActual}</td>
                  
                  {/* --- CHECKBOX DE PAGO (APORTE) --- */}
                  <td>
                    <input
                      type="checkbox"
                      // Usa el estado LOCAL para el valor
                      checked={isAportePagado} 
                      disabled={rowLoading}
                      // Llama a la función que actualiza el estado LOCAL
                      onChange={(e) => handleToggleAporte(a, e.target.checked)}
                      aria-label={`Aporte de ${a.nombre} pagado`}
                    />
                  </td>
                  
                  {/* --- SELECT DE ESTADO (ACCIONES) --- */}
                  <td>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select
                        value={estadoActual}
                        disabled={rowLoading}
                        onChange={(e) => handleChangeEstado(a, e.target.value)}
                        aria-label={`Cambiar estado de ${a.nombre}`}
                      >
                        {VALID_STATES.map((s) => {
                          const isAllowed = s === estadoActual || allowedLocal.includes(s)
                          
                          // Deshabilitación por pago (USA el estado local `isAportePagado`)
                          const disablePendienteJuridico = s === 'Pendiente Jurídico' && !isAportePagado
                          
                          const isDisabled = !isAllowed || disablePendienteJuridico
                          
                          return (
                            <option 
                              key={s} 
                              value={s} 
                              disabled={isDisabled} 
                            >
                              {s}
                            </option>
                          )
                        })}
                      </select>

                      {rowLoading && <span style={{ color: '#2563eb' }}>Actualizando…</span>}
                      {rowError && <span className="error" style={{ marginLeft: 8 }}>{rowError}</span>}
                      {rowSuccess && <span className="info" style={{ marginLeft: 8 }}>{rowSuccess}</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}