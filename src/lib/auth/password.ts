import "server-only";

// Punto de entrada para la aplicación: impide importar el hash de contraseñas
// desde componentes de cliente.
export * from "./password-hash";
