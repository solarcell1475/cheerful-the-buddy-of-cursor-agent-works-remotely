#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const wireDir = path.join(__dirname, '..', 'packages', 'cheerful-wire');

if (process.env.SKIP_CHEERFUL_WIRE_BUILD) {
  console.log('Skipping cheerful-wire build (SKIP_CHEERFUL_WIRE_BUILD set)');
  process.exit(0);
}

if (fs.existsSync(path.join(wireDir, 'package.json'))) {
  try {
    console.log('Building cheerful-wire...');
    execSync('yarn build', { cwd: wireDir, stdio: 'inherit' });
    console.log('cheerful-wire built successfully');
  } catch (e) {
    console.warn('Warning: cheerful-wire build failed, continuing...');
  }
}
