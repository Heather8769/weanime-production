#!/usr/bin/env node

/**
 * WeAnime MCP Bridge
 * Allows running MCP commands from the WeAnime project directory
 */

const { spawn } = require('child_process');
const path = require('path');

const MCP_DASHBOARD_PATH = '/Users/shigeo/Downloads/mcp_fullstack_dashboard_with_checklist/mcp-dashboard';

function main() {
  console.log('🎬 WeAnime → MCP Dashboard Bridge');
  console.log(`🚀 Running: node cli.js ${process.argv.slice(2).join(' ')}\n`);
  
  // Execute the MCP CLI with all arguments
  const child = spawn('node', ['cli.js', ...process.argv.slice(2)], {
    cwd: MCP_DASHBOARD_PATH,
    stdio: 'inherit'
  });
  
  child.on('close', (code) => {
    process.exit(code);
  });
  
  child.on('error', (error) => {
    console.error('❌ Error running MCP CLI:', error.message);
    console.log('💡 Make sure MCP Dashboard is running and accessible.');
    process.exit(1);
  });
}

if (require.main === module) {
  main();
}