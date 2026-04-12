# DEX - Decentralized Exchange

## Objetivo
Construir un DEX (Decentralized Exchange) con smart contracts en Solidity y una web profesional en Next.js para interactuar con ellos. Sin base de datos - todo on-chain.

## Stack Tecnologico

### Smart Contracts
- **Framework**: Foundry (forge, anvil)
- **Lenguaje**: Solidity 0.8+
- **Red local**: Anvil (fork de Ethereum local)
- **Contratos necesarios**:
  - `TokenA.sol` (ERC20 "TA") - Token de prueba A
  - `TokenB.sol` (ERC20 "TB") - Token de prueba B
  - `DEX.sol` - Contrato principal del exchange con:
    - Swap (intercambio de tokens)
    - Add Liquidity (agregar liquidez al pool)
    - Remove Liquidity (retirar liquidez del pool)
    - LP Token (token de liquidez para proveedores)
    - Fee fija del 0.3% en cada swap:
      - 0.1% para el protocolo (owner del contrato)
      - 0.2% para los proveedores de liquidez

### Script de Deploy
- Desplegar TokenA, TokenB y DEX en anvil
- Hacer testing de los contratos
- Mintear tokens TA y TB para las 10 primeras cuentas de anvil
- Cantidad sugerida: 10000 tokens de cada uno por cuenta
- Pasar informacion sobre los contratos a la aplicacion web.
- No lanzar el anvil. Ya esta

### Frontend
- **Framework**: Next.js 16 con TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Web3**: viem + wagmi para conectar con MetaMask/wallets
- **Fondo blanco**, diseno profesional y limpio
- **Sin base de datos** - toda la data viene del blockchain

## Estructura del Proyecto
```
dex para el contrato en solicity
web para la aplicacion web en nextjs 16.
```

## Funcionalidades de la Web

### 1. Swap
- Seleccionar token de entrada (TA o TB)
- Ingresar cantidad
- Ver cantidad estimada de salida (con fee descontada)
- Ejecutar swap

### 2. Add Liquidity
- Ingresar cantidad de TokenA y TokenB
- Calcular ratio segun reservas actuales
- Recibir LP tokens proporcionales
- Ejecutar add liquidity

### 3. Remove Liquidity
- Ingresar cantidad de LP tokens a quemar
- Ver cantidad estimada de TA y TB a recibir
- Ejecutar remove liquidity

### 4. Dashboard (visible siempre)
- Reservas del pool: cantidad de TokenA y TokenB
- Total LP tokens emitidos
- Share del pool de la cuenta conectada (%)
- Balance de TokenA de la cuenta conectada
- Balance de TokenB de la cuenta conectada
- Balance de LP tokens de la cuenta conectada
- Fees acumuladas del protocolo (TA y TB)
- Fees acumuladas del liquidity pool (TA y TB)

## Reglas de Codigo
1. No usar base de datos - todo viene del smart contract
2. No usar `any` en TypeScript - interfaces tipadas
3. Usar `@/` alias para imports
4. Server components por defecto, `'use client'` solo cuando sea necesario
5. Fondo blanco, tipografia oscura, diseno limpio y profesional
6. Usar shadcn/ui para todos los componentes UI
7. Usar `frontend-design` skill para paginas y componentes
8. `npm run build` debe compilar sin errores al finalizar
9. Smart contracts deben pasar todos los tests con `forge test`

## Variables de Entorno (.env.local)
1. Estas variables seran actualizadas cuando se haga el deploy del contrato.
```
NEXT_PUBLIC_ANVIL_RPC=http://127.0.0.1:8545
NEXT_PUBLIC_TOKEN_A_ADDRESS=<deployed address>
NEXT_PUBLIC_TOKEN_B_ADDRESS=<deployed address>
NEXT_PUBLIC_DEX_ADDRESS=<deployed address>
```

## nextjs
1. leer el fichero AGENTS.md de la aplicacion web para obtener contexto adicional.


## Comandos Utiles
```bash
# Anvil (red local)
anvil

# Compilar contratos
cd dex && forge build

# Tests
cd dex && forge test -vvv

# Deploy
cd dex && forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# Frontend
npm run dev
npm run build
```
