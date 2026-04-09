---
name: pre-commit
description: Ejecuta todas las verificaciones necesarias antes de hacer commit o push. Activar cuando el usuario dice "hacer commit", "commitear", "push" o al finalizar una feature.
---

# Pre-commit Checklist

Ejecuta en orden. Si cualquier check falla, para y corrige antes de commitear.

```bash
echo "=== 1/4 TypeScript ==="
pnpm exec tsc --noEmit || { echo "❌ TypeScript errors. Fix before commit."; exit 1; }
echo "✅ TypeScript OK"

echo "=== 2/4 Tests ==="
pnpm test --run 2>&1 | tail -5 || { echo "❌ Tests failing. Fix before commit."; exit 1; }
echo "✅ Tests OK"

echo "=== 3/4 ESLint ==="
npx eslint src/ --quiet 2>&1 | tail -5 || { echo "⚠️ ESLint warnings. Review."; }
echo "✅ ESLint OK"

echo "=== 4/4 Secret scan ==="
git diff --staged | grep -iE '(password|secret|api_key|service_role|private_key)\s*=' | grep -v 'example\|placeholder' && echo "❌ Possible secret detected!" && exit 1 || true
echo "✅ No secrets detected"

echo ""
echo "✅ All checks passed. Ready to commit."
```
