import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { mcpServer } from './server';
import './tools';

async function main() {
  const transport = new StdioServerTransport();
  console.error('AgentMap MCP server running on stdio');
  const connectPromise = mcpServer.connect(transport);
  const timeout = setTimeout(() => {
    console.error('MCP server connect timeout!');
    process.exit(1);
  }, 5000);
  await connectPromise;
  clearTimeout(timeout);
  console.error('MCP server connected');

  const shutdown = async (signal: string) => {
    console.error(`Received ${signal}, shutting down...`);
    try {
      await mcpServer.close();
    } catch (e) {
      console.error('Error during MCP server shutdown:', e);
    }
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  await new Promise(() => {});
}

main().catch((error) => {
  console.error('MCP server error:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});