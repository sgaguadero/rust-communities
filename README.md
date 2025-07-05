# PFM Rust - Solana
![Proyecto Rust Solana](https://raw.githubusercontent.com/codecrypto-academy/rust-proyecto/refs/heads/assets/images/pfm-web3-rust.png)

## Especificaciones de la Aplicación de Gestión de Comunidades

### Descripción General
Sistema de gestión de comunidades que permite a los afiliados crear y participar en votaciones con preguntas de opción múltiple.

---
## Características Principales

### Gestión de Comunidades
- Creación y administración de comunidades
- Sistema de afiliación a comunidades
- Roles de administrador y afiliado

### Sistema de Votaciones
- Creación de preguntas con 2-4 opciones de respuesta
- Establecimiento de fechas límite para votaciones
- Sistema de votación único por afiliado
- Resultados en tiempo real

### Requisitos Técnicos
- Implementación en Rust para Solana
- Almacenamiento en blockchain
- Smart contracts para la lógica de negocio
- Interfaz de usuario web

---
## Funcionalidades Detalladas

### Para Administradores
- Crear y gestionar comunidades
- Aprobar nuevos afiliados
- Ver estadísticas de participación

### Para Afiliados
- Unirse a comunidades
- Crear preguntas de votación
- Participar en votaciones existentes
- Ver resultados de votaciones

---
## Restricciones
- Máximo 4 opciones por pregunta
- Mínimo 2 opciones por pregunta
- Un voto por afiliado por pregunta
- Votaciones con fecha límite obligatoria

---
## Seguridad
- Verificación de identidad de afiliados
- Prevención de votos duplicados
- Registro inmutable de votaciones en blockchain

---
## Dev Roadmap - Plan de Desarrollo
### Parte 1: Backend en Solana (Rust + Anchor)
 1. Instalación de herramientas: solana, rust, anchor, spl-token, solana-test-validator, etc.
 2. Desarrollo del solana program en Rust con Anchor.
 3. Pruebas unitarias del programa en función de las features.

### Parte 2: Interfaz Web - Admin
1. Aplicacion web que implemente las funcionalidades para el perfil admin.

### Parte 3: Interfaz Web - Afiliados (Members)
1. Aplicacion web que implemente las funcionalidades para el perfil afiliado.

---
## Instalación

