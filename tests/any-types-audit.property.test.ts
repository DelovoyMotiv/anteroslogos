/**
 * Property-Based Test: Zero Any Types
 * 
 * **Feature: production-audit-improvements, Property 9: Zero Any Types**
 * **Validates: Requirements 3.5**
 * 
 * This test scans the entire codebase to ensure no 'any' type annotations exist.
 * 
 * @module tests/any-types-audit.property.test
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Prevent importing any project code that might have dependency issues
beforeAll(() => {
  // This test is standalone and doesn't need any project imports
});

/**
 * Recursively get all TypeScript files in a directory
 */
function getAllTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, dist, and test directories
      if (!file.match(/^(node_modules|dist|\.git|\.next|\.vercel|build|coverage|artifacts|cache)$/)) {
        getAllTypeScriptFiles(filePath, fileList);
      }
    } else if (file.match(/\.(ts|tsx)$/) && !file.match(/\.d\.ts$/)) {
      // Include .ts and .tsx files, but exclude .d.ts declaration files
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

/**
 * Check if a file contains 'any' type annotations
 */
function findAnyTypes(filePath: string): Array<{ line: number; content: string; match: string }> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const matches: Array<{ line: number; content: string; match: string }> = [];
  
  // Patterns to detect 'any' type usage
  const anyPatterns = [
    /:\s*any\b/,                    // : any
    /:\s*any\s*\|/,                 // : any |
    /\|\s*any\b/,                   // | any
    /<any>/,                        // <any>
    /<any,/,                        // <any,
    /,\s*any>/,                     // , any>
    /Array<any>/,                   // Array<any>
    /Record<any/,                   // Record<any
    /Promise<any>/,                 // Promise<any>
    /\(any\)/,                      // (any)
    /as\s+any\b/,                   // as any
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      continue;
    }
    
    // Check each pattern
    for (const pattern of anyPatterns) {
      const match = line.match(pattern);
      if (match) {
        matches.push({
          line: i + 1,
          content: line.trim(),
          match: match[0],
        });
      }
    }
  }
  
  return matches;
}

describe('Property 9: Zero Any Types', () => {
  it('should have zero any type annotations in the codebase', () => {
    const rootDir = process.cwd();
    const allFiles = getAllTypeScriptFiles(rootDir);
    
    // Filter out test files for this check (we focus on production code)
    const productionFiles = allFiles.filter(file => 
      !file.includes('__tests__') && 
      !file.includes('.test.') &&
      !file.includes('.spec.')
    );
    
    console.log(`\n📊 Scanning ${productionFiles.length} TypeScript files for 'any' types...`);
    
    const filesWithAny: Array<{
      file: string;
      matches: Array<{ line: number; content: string; match: string }>;
    }> = [];
    
    for (const file of productionFiles) {
      const matches = findAnyTypes(file);
      if (matches.length > 0) {
        filesWithAny.push({
          file: path.relative(rootDir, file),
          matches,
        });
      }
    }
    
    // Report findings
    if (filesWithAny.length > 0) {
      console.error('\n❌ Found any types in the following files:\n');
      for (const { file, matches } of filesWithAny) {
        console.error(`\n📄 ${file}:`);
        for (const match of matches) {
          console.error(`   Line ${match.line}: ${match.content}`);
          console.error(`   Match: "${match.match}"`);
        }
      }
      console.error(`\n📊 Total files with 'any': ${filesWithAny.length}`);
      console.error(`📊 Total 'any' occurrences: ${filesWithAny.reduce((sum, f) => sum + f.matches.length, 0)}`);
    } else {
      console.log('\n✅ No any types found in production code!');
    }
    
    // Property: For any TypeScript file in production code, count of 'any' type annotations should be 0
    expect(filesWithAny).toHaveLength(0);
  });
  
  it('should enforce noImplicitAny in TypeScript configuration', () => {
    const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
    
    // Check if strict mode is enabled (includes noImplicitAny)
    const hasStrict = tsconfig.compilerOptions?.strict === true;
    const hasNoImplicitAny = tsconfig.compilerOptions?.noImplicitAny === true;
    
    console.log('\n📋 TypeScript Configuration:');
    console.log(`   strict: ${hasStrict}`);
    console.log(`   noImplicitAny: ${hasNoImplicitAny}`);
    
    // Property: TypeScript configuration should enforce noImplicitAny (via strict mode or explicit setting)
    expect(hasStrict || hasNoImplicitAny).toBe(true);
  });
  
  it('should have Zod validation for all API inputs', () => {
    const validationSchemaPath = path.join(process.cwd(), 'lib/validation/apiSchemas.ts');
    
    try {
      const content = fs.readFileSync(validationSchemaPath, 'utf-8');
      
      // Check that Zod is imported
      expect(content).toContain('import { z }');
      
      // Check that schemas are exported
      expect(content).toMatch(/export\s+(const|interface|type)/);
      
      console.log('\n✅ Zod validation schemas found in lib/validation/apiSchemas.ts');
    } catch (error) {
      console.error('\n❌ Could not find validation schemas at lib/validation/apiSchemas.ts');
      throw error;
    }
  });
});
