// Estados válidos (deben mantenerse en sync con el backend)
export const VALID_STATES = [
  'Prospecto',
  'Expediente en Construcción',
  'Pendiente Jurídico',
  'Pendiente Cierre de Crédito',
  'Pendiente Firma y Litivo',
  'Pendiente Revisión Abogado',
  'Cartera Activa',
  'Desembolsado/Finalizado'
] as const

// 🔒 REGLA DE LINEALIDAD ESTRICTA:
// Cada estado solo puede avanzar al ÚNICO estado siguiente definido.
// El frontend (en handleChangeEstado) usará solo el primer elemento de este array (index 0).

export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  // Estado inicial: solo puede ir a "Prospecto"
  '': ['Prospecto'], 
  
  // Prospecto --> Expediente en Construcción
  Prospecto: ['Expediente en Construcción'],
  
  // Expediente en Construcción --> Pendiente Jurídico (Se elimina la bifurcación)
  'Expediente en Construcción': ['Pendiente Jurídico'],
  
  // Pendiente Jurídico --> Pendiente Cierre de Crédito (Se elimina la bifurcación)
  'Pendiente Jurídico': ['Pendiente Cierre de Crédito'],
  
  // Pendiente Cierre de Crédito --> Pendiente Firma y Litivo
  'Pendiente Cierre de Crédito': ['Pendiente Firma y Litivo'],
  
  // Pendiente Firma y Litivo --> Pendiente Revisión Abogado
  'Pendiente Firma y Litivo': ['Pendiente Revisión Abogado'],
  
  // Pendiente Revisión Abogado --> Cartera Activa
  'Pendiente Revisión Abogado': ['Cartera Activa'],
  
  // Cartera Activa --> Desembolsado/Finalizado
  'Cartera Activa': ['Desembolsado/Finalizado'],
  
  // Estado final
  'Desembolsado/Finalizado': []
}