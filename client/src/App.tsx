import React from 'react'
import AsociadosList from './components/AsociadosList'

export default function App() {
  // Puedes pasar aquí la URL pública correcta si la confirmas:
  const publicJsonUrl = undefined // o 'https://...' si quieres forzar
  return (
    <div>
      <AsociadosList publicJsonUrl={publicJsonUrl} />
    </div>
  )
}