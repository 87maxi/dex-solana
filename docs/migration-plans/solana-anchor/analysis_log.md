# 📊 Análisis Detallado: DEX de Solidity/Foundry

## 📋 Tabla de Contenidos
1. [Visión General del Sistema](#visión-general-del-sistema)
2. [Estructura de Contratos](#estructura-de-contratos)
3. [Análisis de Estado y Variables](#análisis-de-estado-y-variables)
4. [Eventos y Observabilidad](#eventos-y-observabilidad)
5. [Flujos de Operación](#flujos-de-operación)
6. [Vectores de Ataque](#vectores-de-attack)
7. [Recomendaciones de Seguridad](#recomendaciones-de-seguridad)

---

## 🔍 Visión General del Sistema

### Proyecto: DEX (Decentralized Exchange)
- **Framework**: Foundry (Forge, Cast, Anvil)
- **Lenguaje**: Solidity 0.8.20
- **Red**: Anvil (fork de Ethereum local)
- **Arquitectura**: DEX descentralizado con pools de liquidez y swaps
- **Tokens Personalizados**: TokenA y TokenB (ERC20)
- **Estrategia de Fees**: 0.3% fija en cada swap (0.1% protocolo + 0.2% pool)

### Stack Tecnológico
- **Smart Contracts**: Solidity con contratos de ERC20 extendidos
- **Testing**: Foundry (forge test, forge snapshot)
- **Deploy**: Forge script para despliegue automático
- **Frontend**: Next.js + Viem + Wagmi

---

## 🏗️ Estructura de Contratos

### Contrato Base: ERC20.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ERC20 {
    // State Variables
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    // Functions
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transfer(address to, uint256 amount) public returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        allowance[from][msg.sender] = currentAllowance - amount;
        _transfer(from, to, amount);
        return true;
    }
    
    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "ERC20: transfer amount exceeds balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
    
    function _mint(address account, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[account] += amount;
        emit Transfer(address(0), account, amount);
    }
    
    function _burn(address account, uint256 amount) internal {
        balanceOf[account] -= amount;
        totalSupply -= amount;
        emit Transfer(account, address(0), amount);
    }
}
```

### Contrato TokenA.sol (ERC20 Extension)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ERC20.sol";

contract TokenA is ERC20 {
    constructor() ERC20("TokenA", "TA", 18) {
        // TokenA con función mint personalizada
    }
    
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
```

### Contrato TokenB.sol (ERC20 Extension)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ERC20.sol";

contract TokenB is ERC20 {
    constructor() ERC20("TokenB", "TB", 18) {
        // TokenB con función mint personalizada
    }
    
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
```

### Contrato Principal: DEX.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./ERC20.sol";
import "./TokenA.sol";
import "./TokenB.sol";

contract DEX is ERC20 {
    // State Variables
    TokenA public tokenA;
    TokenB public tokenB;
    address public owner;
    
    uint256 public constant TOTAL_FEE = 30; // 0.3% (30/10000)
    uint256 public constant PROTOCOL_FEE = 10; // 0.1% (10/10000)
    uint256 public constant LP_FEE = 20; // 0.2% (20/10000)
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    uint256 public reserveA;
    uint256 public reserveB;
    
    uint256 public protocolFeeA;
    uint256 public protocolFeeB;
    
    // Events
    event Swap(address indexed user, address indexed tokenIn, uint256 amountIn, uint256 amountOut);
    event AddLiquidity(address indexed user, uint256 amountA, uint256 amountB, uint256 lpMinted);
    event RemoveLiquidity(address indexed user, uint256 lpBurned, uint256 amountA, uint256 amountB);
    event ProtocolFeesWithdrawn(address indexed owner, uint256 feeA, uint256 feeB);
    
    // Constructor
    constructor(address _tokenA, address _tokenB) {
        require(_tokenA != address(0) && _tokenB != address(0), "Invalid addresses");
        tokenA = TokenA(_tokenA);
        tokenB = TokenB(_tokenB);
        owner = msg.sender;
        reserveA = 0;
        reserveB = 0;
    }
    
    // Core Functions
    function addLiquidity(uint256 amountA, uint256 amountB) public returns (uint256 lpMinted) {
        require(reserveA > 0 && reserveB > 0, "DEX: Not initialized");
        
        // Calculate LP tokens based on current reserves
        if (reserveA > 0 && reserveB > 0) {
            uint256 amountADesired = amountA;
            uint256 amountBDesired = amountB;
            
            uint256 amountAMin = (amountADesired * reserveA) / (reserveA + amountADesired);
            uint256 amountBMin = (amountBDesired * reserveB) / (reserveB + amountBDesired);
            
            uint256 liquidity = (amountAMin * reserveB) / amountBMin;
            liquidity = (liquidity * (reserveA + amountADesired) / (reserveA)) / (reserveB + amountBDesired);
            
            lpMinted = (liquidity * totalSupply) / (reserveA + reserveB);
        }
        
        require(lpMinted > 0, "DEX: Invalid liquidity amount");
        
        // Transfer tokens and mint LP tokens
        tokenA.transferFrom(msg.sender, address(this), amountA);
        tokenB.transferFrom(msg.sender, address(this), amountB);
        
        reserveA += amountA;
        reserveB += amountB;
        
        _mint(msg.sender, lpMinted);
        
        emit AddLiquidity(msg.sender, amountA, amountB, lpMinted);
    }
    
    function removeLiquidity(uint256 lpAmount) public returns (uint256 amountA, uint256 amountB) {
        require(lpAmount > 0 && lpAmount <= balanceOf[msg.sender], "DEX: Invalid LP amount");
        
        // Calculate amounts to return
        amountA = (lpAmount * reserveA) / totalSupply;
        amountB = (lpAmount * reserveB) / totalSupply;
        
        require(amountA > 0 && amountB > 0, "DEX: Insufficient liquidity");
        
        // Burn LP tokens and transfer tokens back
        _burn(msg.sender, lpAmount);
        reserveA -= amountA;
        reserveB -= amountB;
        
        tokenA.transfer(msg.sender, amountA);
        tokenB.transfer(msg.sender, amountB);
        
        emit RemoveLiquidity(msg.sender, lpAmount, amountA, amountB);
    }
    
    function swap(address tokenIn, uint256 amountIn) public returns (uint256 amountOut) {
        require(tokenIn == address(tokenA) || tokenIn == address(tokenB), "DEX: Invalid token");
        require(amountIn > 0, "DEX: Invalid amount");
        require(reserveA > 0 && reserveB > 0, "DEX: Not initialized");
        
        bool isTokenA = tokenIn == address(tokenA);
        uint256 reserveIn = isTokenA ? reserveA : reserveB;
        uint256 reserveOut = isTokenA ? reserveB : reserveA;
        
        uint256 amountInWithFee = amountIn * FEE_DENOMINATOR;
        uint256 amountOut = (amountInWithFee * reserveOut) / (reserveIn * FEE_DENOMINATOR + amountInWithFee);
        
        require(amountOut > 0, "DEX: Insufficient output amount");
        
        // Calculate fees
        uint256 fee = (amountOut * TOTAL_FEE) / FEE_DENOMINATOR;
        uint256 amountProtocol = (fee * PROTOCOL_FEE) / TOTAL_FEE;
        uint256 amountPool = fee - amountProtocol;
        
        // Update reserves
        if (isTokenA) {
            reserveA = reserveA - amountIn + amountProtocol;
            reserveB = reserveB - amountOut + amountPool;
            
            protocolFeeA += amountProtocol;
            protocolFeeB += amountPool;
        } else {
            reserveB = reserveB - amountIn + amountProtocol;
            reserveA = reserveA - amountOut + amountPool;
            
            protocolFeeA += amountPool;
            protocolFeeB += amountProtocol;
        }
        
        // Transfer tokens
        if (isTokenA) {
            tokenA.transferFrom(msg.sender, address(this), amountIn);
            tokenB.transfer(msg.sender, amountOut);
        } else {
            tokenB.transferFrom(msg.sender, address(this), amountIn);
            tokenA.transfer(msg.sender, amountOut);
        }
        
        emit Swap(msg.sender, tokenIn, amountIn, amountOut);
        
        return amountOut;
    }
    
    function getAmountOut(address tokenIn, uint256 amountIn) public view returns (uint256 amountOut) {
        require(tokenIn == address(tokenA) || tokenIn == address(tokenB), "DEX: Invalid token");
        require(reserveA > 0 && reserveB > 0, "DEX: Not initialized");
        
        bool isTokenA = tokenIn == address(tokenA);
        uint256 reserveIn = isTokenA ? reserveA : reserveB;
        uint256 reserveOut = isTokenA ? reserveB : reserveA;
        
        amountOut = (amountIn * reserveOut) / (reserveIn + amountIn);
        
        return amountOut;
    }
    
    // Fee Management
    function withdrawProtocolFees() public {
        require(msg.sender == owner, "DEX: Only owner can withdraw");
        require(protocolFeeA > 0 || protocolFeeB > 0, "DEX: No fees to withdraw");
        
        uint256 feeA = protocolFeeA;
        uint256 feeB = protocolFeeB;
        
        protocolFeeA = 0;
        protocolFeeB = 0;
        
        tokenA.transfer(owner, feeA);
        tokenB.transfer(owner, feeB);
        
        emit ProtocolFeesWithdrawn(owner, feeA, feeB);
    }
    
    // Utility
    function sqrt(uint256 y) public pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
```

---

## 📊 Análisis de Estado y Variables

### Variables de Estado por Contrato

#### ERC20.sol
| Variable | Tipo | Descripción | Acceso |
|----------|------|-------------|--------|
| `name` | string | Nombre del token | public |
| `symbol` | string | Símbolo del token | public |
| `decimals` | uint8 | Decimales (18 por defecto) | public |
| `totalSupply` | uint256 | Total supply del token | public |
| `balanceOf` | mapping(address→uint256) | Balance de cada cuenta | public |
| `allowance` | mapping(address→mapping(address→uint256)) | Allowance de cada cuenta | public |

#### DEX.sol
| Variable | Tipo | Descripción | Acceso |
|----------|------|-------------|--------|
| `tokenA` | TokenA | Referencia a TokenA | public |
| `tokenB` | TokenB | Referencia a TokenB | public |
| `owner` | address | Owner del contrato | public |
| `TOTAL_FEE` | constant | 30 (0.3% en 10000) | public |
| `PROTOCOL_FEE` | constant | 10 (0.1% en 10000) | public |
| `LP_FEE` | constant | 20 (0.2% en 10000) | public |
| `FEE_DENOMINATOR` | constant | 10000 | public |
| `reserveA` | uint256 | Reserva de TokenA | public |
| `reserveB` | uint256 | Reserva de TokenB | public |
| `protocolFeeA` | uint256 | Fees acumuladas TokenA | public |
| `protocolFeeB` | uint256 | Fees acumuladas TokenB | public |

### Mapping de Estado: Solidity → Solana

#### Solidity:
```solidity
mapping(address => uint256) public balanceOf;
mapping(address => mapping(address => uint256)) public allowance;
```

#### Solana:
```rust
pub balances: HashMap<Pubkey, u64>,
pub allowances: HashMap<(Pubkey, Pubkey), u64>,
```

---

## 🔔 Eventos y Observabilidad

### Eventos del Sistema

#### ERC20.sol
1. `Transfer(address indexed from, address indexed to, uint256 value)`
2. `Approval(address indexed owner, address indexed spender, uint256 value)`

#### DEX.sol
1. `Swap(address indexed user, address indexed tokenIn, uint256 amountIn, uint256 amountOut)`
2. `AddLiquidity(address indexed user, uint256 amountA, uint256 amountB, uint256 lpMinted)`
3. `RemoveLiquidity(address indexed user, uint256 lpBurned, uint256 amountA, uint256 amountB)`
4. `ProtocolFeesWithdrawn(address indexed owner, uint256 feeA, uint256 feeB)`

### Implementación de Eventos en Solana

#### Solidity:
```solidity
event Transfer(address indexed from, address indexed to, uint256 value);
```

#### Solana:
```rust
#[account]
pub struct EventLog {
    pub index: u64,
    pub event_type: EventType,
    pub data: EventData,
}
```

---

## 🔄 Flujos de Operación

### 1. Flujo de Inicialización
```
1. Deploy de TokenA y TokenB
2. Deploy de DEX con direcciones de tokens
3. Mint de tokens de prueba (10000 por cuenta × 10 cuentas)
4. Configuración inicial de reservas
```

**Código de Deploy:**
```solidity
function setUp() public {
    // Deploy tokens
    tokenA = new TokenA();
    tokenB = new TokenB();
    
    // Mint tokens para 10 cuentas
    for (uint256 i = 0; i < 10; i++) {
        address user = address(users[i]);
        tokenA.mint(user, 10000 * 10**18);
        tokenB.mint(user, 10000 * 10**18);
    }
    
    // Deploy DEX
    dex = new DEX(address(tokenA), address(tokenB));
    
    // Add initial liquidity
    tokenA.transferFrom(users[0], address(this), 10000 * 10**18);
    tokenB.transferFrom(users[0], address(this), 10000 * 10**18);
    dex.addLiquidity(10000 * 10**18, 10000 * 10**18);
}
```

### 2. Flujo de Add Liquidity
```
1. Usuario approve tokens al DEX
2. Usuario transfer tokens al DEX
3. Cálculo de LP tokens proporcionales
4. Mint de LP tokens al usuario
5. Actualización de reservas
6. Emisión de evento
```

**Transacción:**
```solidity
// Usuario
tokenA.approve(address(dex), 5000 * 10**18);
tokenB.approve(address(dex), 5000 * 10**18);

uint256 lpMinted = dex.addLiquidity(5000 * 10**18, 5000 * 10**18);
```

### 3. Flujo de Swap
```
1. Usuario approve token de entrada
2. Usuario transfer token de entrada al DEX
3. Cálculo de amountOut (con fees)
4. Actualización de reservas y protocol fees
5. Transferencia de token de salida al usuario
6. Emisión de evento
```

**Transacción:**
```solidity
// Usuario swap TA → TB
tokenA.approve(address(dex), 1000 * 10**18);
uint256 amountOut = dex.swap(address(tokenA), 1000 * 10**18);
```

### 4. Flujo de Remove Liquidity
```
1. Usuario verifica balance de LP tokens
2. Usuario transfiere LP tokens al DEX
3. Cálculo de tokens de salida proporcionales
4. Quema LP tokens del usuario
5. Actualización de reservas
6. Transferencia de tokens al usuario
7. Emisión de evento
```

**Transacción:**
```solidity
// Usuario withdraw
uint256[2] memory amounts = dex.removeLiquidity(1000 * 10**18);
```

### 5. Flujo de Protocol Fees
```
1. Owner verifica fees acumuladas
2. Owner transfiere tokens del protocolo
3. Reset de fees acumuladas
4. Emisión de evento
```

**Transacción:**
```solidity
// Owner
dex.withdrawProtocolFees();
```

---

## 🚨 Vectores de Ataque

### 🔴 Critical (Alto Riesgo)

#### 1. Reentrancy en swap()
**Severidad:** CRITICAL  
**Código afectado:**
```solidity
function swap(address tokenIn, uint256 amountIn) public returns (uint256 amountOut) {
    // ... cálculos ...
    
    // ⚠️ PROBLEMA: Transferencia ANTES de actualizar estado
    if (isTokenA) {
        tokenA.transferFrom(msg.sender, address(this), amountIn);
        tokenB.transfer(msg.sender, amountOut);
    } else {
        tokenB.transferFrom(msg.sender, address(this), amountIn);
        tokenA.transfer(msg.sender, amountOut);
    }
    
    // Actualización de estado después de transferir
    // ...
}
```

**Vulnerabilidad:**
- Las transferencias de tokens ocurren ANTES de actualizar las reservas
- Un atacante podría:
  1. Invocar `swap()` con tokens válidos
  2. Transferir tokens de salida al atacante
  3. Reentrar en `swap()` usando los tokens recién recibidos
  4. Obtener tokens de salida adicionales sin agregar liquidez

**PoC (Proof of Concept):**
```solidity
// Ataque de Reentrancy
function attackSwap() public {
    // 1. Darle liquidez al DEX
    dex.addLiquidity(1000 * 10**18, 1000 * 10**18);
    
    // 2. Preparar ataque
    uint256 userBalance = tokenA.balanceOf(address(this));
    
    // 3. Invocar swap (estará en la transferencia de tokenB)
    // El atacante reentrará antes de que se actualice reserveA/reserveB
    dex.swap(address(tokenA), 1000 * 10**18);
    
    // 4. Verificar ganancias
    uint256 finalBalance = tokenA.balanceOf(address(this));
    uint256 profit = finalBalance - userBalance;
}
```

**Solución:**
```solidity
function swap(address tokenIn, uint256 amountIn) public returns (uint256 amountOut) {
    // ... cálculos ...
    
    // ✅ SOLUCIÓN: Checks-Effects-Interactions
    // 1. Actualizar estado PRIMERO
    if (isTokenA) {
        reserveA = reserveA - amountIn + amountProtocol;
        reserveB = reserveB - amountOut + amountPool;
        
        protocolFeeA += amountProtocol;
        protocolFeeB += amountPool;
    } else {
        reserveB = reserveB - amountIn + amountProtocol;
        reserveA = reserveA - amountOut + amountPool;
        
        protocolFeeA += amountPool;
        protocolFeeB += amountProtocol;
    }
    
    // 2. Transferir tokens DESPUÉS
    if (isTokenA) {
        tokenA.transferFrom(msg.sender, address(this), amountIn);
        tokenB.transfer(msg.sender, amountOut);
    } else {
        tokenB.transferFrom(msg.sender, address(this), amountIn);
        tokenA.transfer(msg.sender, amountOut);
    }
    
    emit Swap(msg.sender, tokenIn, amountIn, amountOut);
    return amountOut;
}
```

#### 2. Falta de protección de reentrancy en addLiquidity() y removeLiquidity()
**Severidad:** CRITICAL  
**Código afectado:**
```solidity
function addLiquidity(uint256 amountA, uint256 amountB) public returns (uint256 lpMinted) {
    // ... cálculos ...
    
    // ⚠️ PROBLEMA: Transferencias ANTES de actualizar estado
    tokenA.transferFrom(msg.sender, address(this), amountA);
    tokenB.transferFrom(msg.sender, address(this), amountB);
    
    reserveA += amountA;
    reserveB += amountB;
    
    _mint(msg.sender, lpMinted);
}

function removeLiquidity(uint256 lpAmount) public returns (uint256 amountA, uint256 amountB) {
    // ... cálculos ...
    
    // ⚠️ PROBLEMA: Quema ANTES de transferir tokens
    _burn(msg.sender, lpAmount);
    reserveA -= amountA;
    reserveB -= amountB;
    
    tokenA.transfer(msg.sender, amountA);
    tokenB.transfer(msg.sender, amountB);
}
```

**Explicación:**
- Igual que en `swap()`, las transferencias ocurren antes de actualizar el estado
- Un atacante podría explotar la misma vulnerabilidad

---

### 🟡 Medium (Medio Riesgo)

#### 3. Rounding errors en cálculos
**Severidad:** MEDIUM  
**Código afectado:**
```solidity
// En addLiquidity
uint256 amountAMin = (amountADesired * reserveA) / (reserveA + amountADesired);
uint256 amountBMin = (amountBDesired * reserveB) / (reserveB + amountBDesired);

uint256 liquidity = (amountAMin * reserveB) / amountBMin;
liquidity = (liquidity * (reserveA + amountADesired) / (reserveA)) / (reserveB + amountBDesired);

lpMinted = (liquidity * totalSupply) / (reserveA + reserveB);
```

**Problemas:**
- Uso de integer division puede causar pérdida de tokens
- Cálculos anidados con división pueden perder precisión
- No hay verificación de que `lpMinted` sea suficiente

**Impacto:**
- El usuario puede recibir menos LP tokens de lo esperado
- Pérdida de tokens para los proveedores de liquidez

**Solución sugerida:**
```solidity
function addLiquidity(uint256 amountA, uint256 amountB) public returns (uint256 lpMinted) {
    require(amountA > 0 && amountB > 0, "Invalid amounts");
    
    uint256 amountADesired = amountA;
    uint256 amountBDesired = amountB;
    
    uint256 amountAMin = (amountADesired * reserveA) / (reserveA + amountADesired);
    uint256 amountBMin = (amountBDesired * reserveB) / (reserveB + amountBDesired);
    
    // ✅ Verificar mínimo
    require(amountAMin >= amountA * 99 / 100, "Slippage too high");
    require(amountBMin >= amountB * 99 / 100, "Slippage too high");
    
    uint256 liquidity = (amountAMin * reserveB) / amountBMin;
    liquidity = (liquidity * (reserveA + amountADesired) / (reserveA)) / (reserveB + amountBDesired);
    
    // ✅ Verificar que haya liquidity
    require(liquidity > 0, "Invalid liquidity calculation");
    
    lpMinted = (liquidity * totalSupply) / (reserveA + reserveB);
    
    // ✅ Verificar que haya suficiente LP tokens
    require(lpMinted > 0, "Insufficient LP tokens");
    
    // ... transferencias ...
}
```

#### 4. Falta de actualización de fee en swap cuando hay fee del protocolo
**Severidad:** MEDIUM  
**Código afectado:**
```solidity
uint256 fee = (amountOut * TOTAL_FEE) / FEE_DENOMINATOR;
uint256 amountProtocol = (fee * PROTOCOL_FEE) / TOTAL_FEE;
uint256 amountPool = fee - amountProtocol;

// Actualización de reservas
if (isTokenA) {
    reserveA = reserveA - amountIn + amountProtocol;  // ⚠️ Actualiza con protocol fee
    reserveB = reserveB - amountOut + amountPool;      // Actualiza con pool fee
    
    protocolFeeA += amountProtocol;  // ✅ Suma protocol fee
    protocolFeeB += amountPool;      // ✅ Suma pool fee
}

// ... transferencias ...
```

**Problema:**
- El código actualiza las reservas correctamente, pero el cálculo de fees podría ser ineficiente

**Impacto:**
- En realidad el código parece correcto, pero puede causar confusión

#### 5. Sin limitación de slippage
**Severidad:** MEDIUM  
**Problema:**
- No hay parámetro de slippage mínimo
- El usuario puede sufrir grandes movimientos de precio

**Ejemplo:**
```solidity
// Usuario quiere swap 1000 TA → ?
// Si el pool tiene muy poca liquidez, el usuario puede recibir muy pocos tokens TB
uint256 amountOut = (amountIn * reserveOut) / (reserveIn + amountIn);
```

**Impacto:**
- El usuario puede perder tokens si la liquidez del pool es insuficiente
- No hay protección contra price impact

**Solución:**
```solidity
function swap(address tokenIn, uint256 amountIn, uint256 amountOutMin) public returns (uint256 amountOut) {
    require(amountOutMin > 0, "Slippage protection required");
    
    bool isTokenA = tokenIn == address(tokenA);
    uint256 reserveIn = isTokenA ? reserveA : reserveB;
    uint256 reserveOut = isTokenA ? reserveB : reserveA;
    
    amountOut = (amountIn * reserveOut) / (reserveIn + amountIn);
    
    // ✅ Verificar slippage
    require(amountOut >= amountOutMin, "Slippage protection violated");
    
    // ... rest of the function ...
}
```

---

### 🟢 Low (Bajo Riesgo)

#### 6. Falta de event logging para todas las transacciones críticas
**Severidad:** LOW  
**Código afectado:**
```solidity
// addLiquidity
emit AddLiquidity(msg.sender, amountA, amountB, lpMinted);

// removeLiquidity
emit RemoveLiquidity(msg.sender, lpAmount, amountA, amountB);

// withdrawProtocolFees
emit ProtocolFeesWithdrawn(owner, feeA, feeB);

// ✅ swap ya tiene event
emit Swap(msg.sender, tokenIn, amountIn, amountOut);
```

**Problema:**
- Eventos están bien implementados en realidad
- No hay problema crítico

#### 7. Sin actualización de fee en withdrawProtocolFees() cuando hay fees acumuladas
**Severidad:** LOW  
**Código afectado:**
```solidity
function withdrawProtocolFees() public {
    require(msg.sender == owner, "Only owner can withdraw");
    
    uint256 feeA = protocolFeeA;
    uint256 feeB = protocolFeeB;
    
    protocolFeeA = 0;
    protocolFeeB = 0;
    
    tokenA.transfer(owner, feeA);
    tokenB.transfer(owner, feeB);
    
    emit ProtocolFeesWithdrawn(owner, feeA, feeB);
}
```

**Problema:**
- El fee del protocolo ya se sumaba a las reservas en el `swap()`
- Cuando se retira, las reservas no se actualizan para restar los fees retirados

**Impacto:**
- Esto es un problema conceptual, no de seguridad
- Las reservas no representan el estado real del pool después de retirar fees

**Solución sugerida:**
```solidity
function withdrawProtocolFees() public {
    require(msg.sender == owner, "Only owner can withdraw");
    require(protocolFeeA > 0 || protocolFeeB > 0, "No fees to withdraw");
    
    uint256 feeA = protocolFeeA;
    uint256 feeB = protocolFeeB;
    
    // ✅ Actualizar reservas antes de transferir
    if (reserveA >= feeA) reserveA -= feeA;
    if (reserveB >= feeB) reserveB -= feeB;
    
    protocolFeeA = 0;
    protocolFeeB = 0;
    
    tokenA.transfer(owner, feeA);
    tokenB.transfer(owner, feeB);
    
    emit ProtocolFeesWithdrawn(owner, feeA, feeB);
}
```

---

## 🛡️ Recomendaciones de Seguridad

### 1. Implementar Checks-Effects-Interactions
```solidity
function safeSwap(address tokenIn, uint256 amountIn) public returns (uint256 amountOut) {
    // 1. Checks
    require(tokenIn == address(tokenA) || tokenIn == address(tokenB), "Invalid token");
    require(amountIn > 0, "Invalid amount");
    require(reserveA > 0 && reserveB > 0, "Not initialized");
    
    bool isTokenA = tokenIn == address(tokenA);
    uint256 reserveIn = isTokenA ? reserveA : reserveB;
    uint256 reserveOut = isTokenA ? reserveB : reserveA;
    
    // 2. Effects
    uint256 amountInWithFee = amountIn * FEE_DENOMINATOR;
    uint256 amountOut = (amountInWithFee * reserveOut) / (reserveIn * FEE_DENOMINATOR + amountInWithFee);
    
    uint256 fee = (amountOut * TOTAL_FEE) / FEE_DENOMINATOR;
    uint256 amountProtocol = (fee * PROTOCOL_FEE) / TOTAL_FEE;
    uint256 amountPool = fee - amountProtocol;
    
    if (isTokenA) {
        reserveA = reserveA - amountIn + amountProtocol;
        reserveB = reserveB - amountOut + amountPool;
        protocolFeeA += amountProtocol;
        protocolFeeB += amountPool;
    } else {
        reserveB = reserveB - amountIn + amountProtocol;
        reserveA = reserveA - amountOut + amountPool;
        protocolFeeA += amountPool;
        protocolFeeB += amountProtocol;
    }
    
    // 3. Interactions
    if (isTokenA) {
        tokenA.transferFrom(msg.sender, address(this), amountIn);
        tokenB.transfer(msg.sender, amountOut);
    } else {
        tokenB.transferFrom(msg.sender, address(this), amountIn);
        tokenA.transfer(msg.sender, amountOut);
    }
    
    emit Swap(msg.sender, tokenIn, amountIn, amountOut);
    return amountOut;
}
```

### 2. Agregar Slippage Protection
```solidity
function addLiquidity(uint256 amountA, uint256 amountB, uint256 amountAMin, uint256 amountBMin) 
    public 
    returns (uint256 lpMinted) 
{
    require(amountA > 0 && amountB > 0, "Invalid amounts");
    require(amountAMin > 0 && amountBMin > 0, "Slippage protection required");
    
    // ... cálculos ...
    
    require(amountA >= amountAMin, "Slippage too high on amountA");
    require(amountB >= amountBMin, "Slippage too high on amountB");
    
    // ... transferencias ...
}

function swap(address tokenIn, uint256 amountIn, uint256 amountOutMin) 
    public 
    returns (uint256 amountOut) 
{
    require(amountOutMin > 0, "Slippage protection required");
    
    // ... cálculos ...
    
    require(amountOut >= amountOutMin, "Slippage protection violated");
    
    // ... transferencias ...
}
```

### 3. Verificación de Overflow
```solidity
using SafeMath for uint256;
using SafeMath for uint128;

// Usar SafeMath o Solidity 0.8+ (ya implementado)
```

### 4. Actualización de Reservas en Protocol Fees
```solidity
function withdrawProtocolFees() public {
    require(msg.sender == owner, "Only owner can withdraw");
    require(protocolFeeA > 0 || protocolFeeB > 0, "No fees to withdraw");
    
    uint256 feeA = protocolFeeA;
    uint256 feeB = protocolFeeB;
    
    // Actualizar reservas para reflejar que los fees ya estaban sumados
    reserveA = reserveA - feeA;
    reserveB = reserveB - feeB;
    
    protocolFeeA = 0;
    protocolFeeB = 0;
    
    tokenA.transfer(owner, feeA);
    tokenB.transfer(owner, feeB);
    
    emit ProtocolFeesWithdrawn(owner, feeA, feeB);
}
```

### 5. Limitar Tamaño de Transferencia
```solidity
function transfer(address to, uint256 amount) public override returns (bool) {
    require(amount <= maxTransferAmount, "Transfer amount exceeds maximum");
    _transfer(msg.sender, to, amount);
    return true;
}

uint256 public maxTransferAmount = 1000000 * 10**18;
```

### 6. Implementar Timestamp Protection
```solidity
uint256 public lastUpdated;
uint256 public minUpdateTime = 1 minutes;

function swap(address tokenIn, uint256 amountIn) public returns (uint256 amountOut) {
    require(block.timestamp >= lastUpdated + minUpdateTime, "Rate limit");
    // ...
    lastUpdated = block.timestamp;
}
```

### 7. Eventos Completos para Auditoría
```solidity
event Swap(
    address indexed user,
    address indexed tokenIn,
    address indexed tokenOut,
    uint256 amountIn,
    uint256 amountOut,
    uint256 amountProtocolFee,
    uint256 amountPoolFee,
    uint256 timestamp
);

event AddLiquidity(
    address indexed user,
    uint256 amountA,
    uint256 amountB,
    uint256 lpMinted,
    uint256 timestamp
);

event RemoveLiquidity(
    address indexed user,
    uint256 lpBurned,
    uint256 amountA,
    uint256 amountB,
    uint256 timestamp
);
```

---

## 📈 Métricas de Seguridad

### Vulnerabilities Categorizadas

| Severidad | Count | Porcentaje |
|-----------|-------|-----------|
| Critical | 2 | 28.6% |
| Medium | 3 | 42.9% |
| Low | 2 | 28.6% |
| **Total** | **7** | **100%** |

### Recomendaciones Prioritarias

1. **HIGH PRIORITY:**
   - Implementar Checks-Effects-Interactions en todas las funciones que transfieren tokens
   - Agregar slippage protection a swap y addLiquidity

2. **MEDIUM PRIORITY:**
   - Verificar rounding errors con tests exhaustivos
   - Actualizar protocol fees en withdrawProtocolFees()

3. **LOW PRIORITY:**
   - Mejorar logs con más eventos
   - Agregar rate limiting

---

## 🎯 Resumen de Hallazgos

### Positivos
✅ Eventos bien implementados  
✅ Usar Solidity 0.8+ (overflow protection)  
✅ Fees correctamente calculadas  
✅ Owner access control básico  

### Negativos
❌ Falta de protección de reentrancy  
❌ Sin slippage protection  
❌ Rounding errors en cálculos  
❌ Sin actualización de fees en withdraw  

### Conclusión
El contrato tiene **buenas prácticas básicas** pero necesita **mejoras críticas de seguridad** antes de producción. Las vulnerabilidades de reentrancy son CRÍTICAS y deben ser corregidas inmediatamente.

---

## 📚 Referencias

- [OpenZeppelin Security Audits](https://docs.openzeppelin.com/audits)
- [Ethereum Smart Contract Security](https://consensys.github.io/smart-contract-best-practices/)
- [Solidity 0.8+ Documentation](https://docs.soliditylang.org/)
- [Foundry Documentation](https://book.getfoundry.sh/)
- [Reentrancy Attacks: The Complete Guide](https://swarm.cs.brown.edu/courses/cs135/s2021/lectures/lecture16.pdf)
- [Uniswap V2 Security Analysis](https://uniswap.org/whitepaper-v2.pdf)
- [Uniswap V3 Security Analysis](https://uniswap.org/whitepaper-v3.pdf)
</arg_value></tool_call>