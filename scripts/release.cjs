#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');

const packages = ['cheerful-wire', 'cheerful-cli', 'cheerful-agent'];

for (const pkg of packages) {
  console.log(`\nReleasing ${pkg}...`);
  try {
    execSync('yarn release', {
      cwd: `packages/${pkg}`,
      stdio: 'inherit',
    });
  } catch (e) {
    console.error(`Failed to release ${pkg}:`, e.message);
    process.exit(1);
  }
}

console.log('\nAll packages released successfully!');
