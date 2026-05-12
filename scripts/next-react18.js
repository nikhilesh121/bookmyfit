#!/usr/bin/env node

const path = require('path');

const registerPath = path.resolve(__dirname, 'next-react18-register.js');
const nodeOptionsPath = registerPath.replace(/\\/g, '/');
const quotedRegisterPath = `"${nodeOptionsPath.replace(/"/g, '\\"')}"`;
const requireOption = `--require ${quotedRegisterPath}`;

if (!process.env.NODE_OPTIONS?.includes(registerPath)) {
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, requireOption].filter(Boolean).join(' ');
}

require(registerPath);

process.argv = [process.argv[0], require.resolve('next/dist/bin/next'), ...process.argv.slice(2)];
require('next/dist/bin/next');
