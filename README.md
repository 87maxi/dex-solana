# DEX - Decentralized Exchange

Un DEX (Automated Market Maker) completo con smart contracts en Solidity y frontend profesional en Next.js 16. Todo on-chain, sin base de datos.

## Stack

| Capa | Tecnologia |
|------|-----------|
| Smart Contracts | Solidity 0.8+ / Foundry (forge, anvil) |
| Frontend | Next.js 16 / TypeScript / Tailwind CSS / shadcn/ui |
| Web3 | viem (publicClient + walletClient directo) |
| Red | Anvil (Ethereum local, chain ID 31337) |

## Estructura del proyecto

```
dex/                    # Proyecto Foundry
  src/
    ERC20.sol           # Implementacion ERC20 base
    TokenA.sol          # Token de prueba TA
    TokenB.sol          # Token de prueba TB
    DEX.sol             # Contrato principal del exchange
  test/
    DEX.t.sol           # 11 tests (swap, liquidity, fees, edge cases)
  script/
    Deploy.s.sol        # Deploy + mint 10000 TA/TB a 10 cuentas anvil

web/                    # Aplicacion Next.js 16
  app/
    page.tsx            # Landing + dashboard principal
    layout.tsx          # Layout con providers
    providers.tsx       # WagmiProvider + QueryClient + WalletProvider
  components/
    Header.tsx          # Navegacion + wallet connect
    SwapCard.tsx        # Intercambio de tokens TA <-> TB
    LiquidityCard.tsx   # Add/Remove liquidity con tabs
    PoolStats.tsx       # Reservas, fees, posicion del usuario
  lib/
    contracts.ts        # ABIs y direcciones de contratos
    wallet-context.tsx  # Contexto global: conexion, reads, writes
    wagmi.ts            # Configuracion wagmi (hardhat chain)
```

## Funcionalidades

### Smart Contract (DEX.sol)
- **Swap**: Intercambio TA <-> TB con formula de producto constante (x*y=k)
- **Add Liquidity**: Depositar TA+TB en proporcion, recibir LP tokens
- **Remove Liquidity**: Quemar LP tokens, recibir TA+TB proporcional
- **Fee**: 0.3% fija por swap (0.1% protocolo + 0.2% para LPs)
- **LP Token**: ERC20 que representa la participacion en el pool
- **getAmountOut**: Vista para estimar output antes de ejecutar swap

### Frontend
- Conexion wallet via MetaMask / wallets compatibles
- Swap con estimacion en tiempo real y detalle de fees
- Add/Remove liquidity con calculo proporcional automatico
- Dashboard: reservas, LP supply, precio, fees acumuladas, posicion del usuario
- Validacion pre-transaccion (balance insuficiente, allowance)
- Mensajes de error legibles parseados desde reverts del contrato

## Como ejecutar

```bash
# 1. Levantar Anvil (en una terminal separada)
anvil

# 2. Compilar y testear contratos
cd dex && forge test -vvv

# 3. Deploy a Anvil
cd dex && forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# 4. Copiar las direcciones desplegadas a web/.env.local
# (el script las imprime por consola)

# 5. Instalar dependencias y levantar frontend
cd web && npm install && npm run dev
```

### Variables de entorno (web/.env.local)
```
NEXT_PUBLIC_ANVIL_RPC=http://127.0.0.1:8545
NEXT_PUBLIC_TOKEN_A_ADDRESS=<direccion desplegada>
NEXT_PUBLIC_TOKEN_B_ADDRESS=<direccion desplegada>
NEXT_PUBLIC_DEX_ADDRESS=<direccion desplegada>
```

### Configurar MetaMask
- Red: `http://127.0.0.1:8545`, Chain ID: `31337`
- Importar cuenta con private key de Anvil (cuenta 0):
  `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

---

## Experiencia de desarrollo y retrospectiva

### Lo que salio bien

**Contratos Solidity**: La parte mas solida de la sesion. El contrato DEX se escribio desde cero con ERC20 propio (sin OpenZeppelin), lo que da control total sobre el codigo. Los 11 tests pasaron a la primera (salvo un error aritmetico en el test de fees: 0.1% de 1000 = 1, no 0.1). El deploy script mintea automaticamente tokens a las 10 cuentas de Anvil.

**Arquitectura del fee**: La separacion 0.1% protocolo (acumulado en variables, retirable por owner) y 0.2% LP (inyectado en reservas, compounding automatico) funciona limpiamente. El `getAmountOut` view permite estimar antes de ejecutar.

**Diseno frontend**: El rediseno con la skill `frontend-design` elevo significativamente la calidad visual. Paleta teal sobre blanco, tipografia Space Grotesk + JetBrains Mono, grid background sutil, glassmorphism en header, cards con hover glow, gradient borders animados.

### Problemas encontrados y como se resolvieron

**1. wagmi hooks para transacciones (el problema principal)**

La mayor friccion de la sesion. Se intentaron tres enfoques con wagmi:

| Intento | Enfoque | Problema |
|---------|---------|----------|
| 1 | `useWriteContract` + `setTimeout` para refetch | Race condition: refetch antes de confirmacion |
| 2 | `useWriteContract` + `useEffect` en `isSuccess` | El hook se quedaba en "Approving..." indefinidamente |
| 3 | `writeContract` + `waitForTransactionReceipt` de `@wagmi/core` | Mismo problema de estado pegado |

**Causa raiz**: Los hooks reactivos de wagmi (`useWriteContract`, `useWaitForTransactionReceipt`) tienen estado interno que no se resetea correctamente entre transacciones encadenadas (approve -> approve -> addLiquidity). En una red local como Anvil donde las transacciones confirman instantaneamente, los hooks no actualizan su estado a tiempo.

**Solucion final**: Se abandono completamente el pattern de hooks de wagmi para escritura. En su lugar se usa **viem directo**:
- `createPublicClient` para leer contratos (reads)
- `createWalletClient` + `window.ethereum` para firmar transacciones (writes)
- `simulateContract` -> `writeContract` -> `waitForTransactionReceipt` como flujo imperativo
- `refreshAll()` al final de cada transaccion confirmada

Este enfoque es 100% predecible: no hay estado reactivo intermedio que pueda quedar inconsistente.

**2. Error "ERC20: insufficient balance" sin informacion**

El catch block original tragaba los errores silenciosamente (`catch { setStatus("Error") }`). Se agrego:
- `parseContractError()` que extrae el revert reason y lo traduce a mensajes legibles
- Validacion pre-transaccion en la UI: si no hay balance suficiente, el boton se deshabilita y se muestra un warning antes de intentar la transaccion
- `console.error` para debugging

**3. Ethers como alternativa intermedia**

Se intento usar ethers.js como reemplazo de wagmi. Funcionaba pero el usuario pidio volver a wagmi. La solucion hibrida final (wagmi para config/providers + viem directo para interacciones) combina lo mejor: el ecosistema de wagmi sin la fragilidad de sus hooks de escritura.

### Leccion clave

**No usar hooks reactivos de wagmi para transacciones encadenadas**. Los hooks (`useWriteContract`, `useWaitForTransactionReceipt`) estan disenados para transacciones aisladas. Cuando necesitas encadenar approve -> approve -> action con refetches intermedios, es mejor usar las funciones imperativas de viem directamente. El pattern `simulateContract` + `writeContract` + `waitForTransactionReceipt` es mas verbose pero 100% controlable.

### Posibles mejoras futuras

- Slippage tolerance configurable en swaps
- Historial de transacciones (leyendo eventos del contrato)
- Graficas de precio con datos historicos
- Soporte para multiples pools/pares
- Mint de tokens desde la UI para testing
- Auto-refresh periodico del pool data
- Deploy automatico que escriba el `.env.local`

---

**Autor**: jviejo
**Asistente**: Claude Opus 4.6 (1M context)
**Fecha**: 2026-03-23
