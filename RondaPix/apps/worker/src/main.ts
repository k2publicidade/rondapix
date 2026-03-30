/**
 * Worker BullMQ — processa jobs assíncronos:
 * - round:start
 * - round:lock-betting
 * - round:run-deck
 * - round:settle
 * - wallet:credit
 * - wallet:debit
 *
 * Implementação completa na Fase 7-8.
 */

console.warn('🔧 Ronda Worker iniciando...');
console.warn('Filas: round, wallet, notification');
console.warn('Aguardando jobs...');

// Placeholder — implementação completa nas fases 7-8
process.on('SIGTERM', () => {
  console.warn('Worker encerrando gracefully...');
  process.exit(0);
});
