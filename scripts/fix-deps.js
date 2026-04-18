/**
 * electron-builder afterPack 钩子
 * 修复依赖解析问题：确保 call-bind-apply-helpers 在顶层 node_modules
 */

const fs = require('fs')
const path = require('path')

module.exports = async function (context) {
  console.log('[fix-deps] Running afterPack hook...')
  
  const appOutDir = context.appOutDir
  const resourcesDir = path.join(appOutDir, 'resources')
  const appDir = path.join(resourcesDir, 'app')
  const nodeModulesDir = path.join(appDir, 'node_modules')

  if (!fs.existsSync(nodeModulesDir)) {
    console.log('[fix-deps] node_modules not found (likely packed in asar), skipping fix-deps')
    console.log('[fix-deps] Done!')
    return
  }

  const depsToFix = ['call-bind-apply-helpers', 'dunder-proto', 'gopd', 'es-errors']

  for (const depName of depsToFix) {
    const srcDir = path.join(nodeModulesDir, depName)
    const nestedSrcDir = findNestedDep(nodeModulesDir, depName)
    
    if (!fs.existsSync(srcDir) && nestedSrcDir) {
      console.log(`[fix-deps] Copying ${depName} from nested to top level`)
      fs.cpSync(nestedSrcDir, srcDir, { recursive: true })
    } else if (fs.existsSync(srcDir)) {
      console.log(`[fix-deps] ${depName} already exists at top level`)
    }
  }

  console.log('[fix-deps] Done!')
}

function findNestedDep(nodeModulesDir, depName) {
  try {
    const entries = fs.readdirSync(nodeModulesDir, { withFileTypes: true })
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      
      const nestedPath = path.join(nodeModulesDir, entry.name, 'node_modules', depName)
      if (fs.existsSync(nestedPath)) {
        return nestedPath
      }
    }
  } catch (err) {
    console.log(`[fix-deps] Warning: could not read ${nodeModulesDir}: ${err.message}`)
  }
  
  return null
}
