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

### Instalación backend

La carpeta `back` contiene el programa de Solana escrito en Rust usando Anchor.

#### Requisitos previos

- Tener instalado [Rust](https://www.rust-lang.org/tools/install)
- Tener instalado [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- Tener instalado [Anchor](https://book.anchor-lang.com/getting_started/installation.html)
- Tener instalado [Node.js](https://nodejs.org/)

#### Instalación y uso

1. Entra a la carpeta del back:
   ```bash
   cd back
   ```

2. Instala las dependencias de Anchor (si es necesario):
   ```bash
   anchor install
   ```

3. Compila el programa con Anchor:
   ```bash
   anchor build
   ```

4. (Opcional) Levanta un validador local de Solana para pruebas:
   ```bash
   solana-test-validator
   ```

5. Ejecuta los tests del programa:
   ```bash
   anchor test --skip-local-validator 
   ```

Esto compilará el programa, desplegará en el validador local y ejecutará los tests definidos en la carpeta `tests`.

Para más detalles sobre Anchor, consulta la [documentación oficial](https://book.anchor-lang.com/).


## Frontend instalación
cd frontend && npm install @coral-xyz/anchor @solana/web3.js @types/node
### Frontend installation and usage

The frontend is built with [Vite](https://vitejs.dev/) and React.

#### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

#### Installation

1. Go to the frontend directory:
   ```bash
   cd front
   ```

2. Install dependencies:
   ```bash
   npm install
   ```
   Or, if you prefer yarn:
   ```bash
   yarn install
   ```

3. (Optional) If you haven't already, install the required Solana and Anchor libraries:
   ```bash
   npm install @coral-xyz/anchor @solana/web3.js @types/node
   ```







