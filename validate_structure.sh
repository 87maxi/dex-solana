#!/bin/bash
# Validación de estructura del proyecto DEX

echo "🔍 Verificando estructura del proyecto Solana DEX..."

# Verificar directorios principales
echo "1. Verificando estructura de directorios..."
if [ -d "solana-dex/programs/solana-dex/src" ]; then
    echo "✅ Directorio de programas: OK"
else
    echo "❌ Directorio de programas: NO ENCONTRADO"
    exit 1
fi

if [ -d "web/components" ]; then
    echo "✅ Directorio de componentes: OK"
else
    echo "❌ Directorio de componentes: NO ENCONTRADO"
    exit 1
fi

# Verificar archivos principales
echo "2. Verificando archivos clave..."

if [ -f "solana-dex/programs/solana-dex/src/lib.rs" ]; then
    echo "✅ Archivo lib.rs: OK"
else
    echo "❌ Archivo lib.rs: NO ENCONTRADO"
    exit 1
fi

if [ -f "web/lib/services/dex-service.ts" ]; then
    echo "✅ Archivo DEXService: OK"
else
    echo "❌ Archivo DEXService: NO ENCONTRADO"
    exit 1
fi

if [ -f "solana-dex/runbooks/full-deploy.sh" ]; then
    echo "✅ Script de deploy: OK"
else
    echo "❌ Script de deploy: NO ENCONTRADO"
    exit 1
fi

echo "✅ Estructura del proyecto verificada correctamente"
echo ""
echo "📋 Estructura encontrada:"
echo "   - solana-dex/programs/solana-dex/src/       (Smart Contract)"
echo "   - web/lib/services/                         (Frontend Service)"
echo "   - runbooks/                                 (Documentación)"
echo ""
echo "🎉 El proyecto está correctamente estructurado para despliegue local"

# Verificar componentes de swap
echo ""
echo "🔍 Verificando componentes de swap..."

if [ -f "web/components/features/swap/SwapCard.tsx" ]; then
    echo "✅ Componente SwapCard.tsx: OK"
else
    echo "⚠️ Componente SwapCard.tsx: NO ENCONTRADO (pero es opcional para validación)"
fi

echo ""
echo "✅ Validación de estructura completada exitosamente"
