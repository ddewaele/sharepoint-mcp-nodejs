# SharePoint MCP Server

A TypeScript MCP (Model Context Protocol) server for SharePoint file and folder management via Microsoft Graph API.

## Features

- **10 MCP tools** for complete SharePoint file/folder management
- **Two auth flows**: Client Credentials (app-level) and On-Behalf-Of (user-level)
- **Two transports**: stdio (for Claude Desktop/CLI) and Streamable HTTP
- **Resumable uploads** for large files (>4MB)
- **Content extraction** from PDF, Word (.docx), Excel (.xlsx), and text files

## Quick Start

### 1. Install dependencies

```bash
npm install
npm run build
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your Azure AD and SharePoint details
```

Required environment variables:
- `AZURE_TENANT_ID` - Azure AD tenant ID
- `AZURE_CLIENT_ID` - App registration client ID
- `AZURE_CLIENT_SECRET` - App registration client secret
- `SHAREPOINT_HOSTNAME` - e.g. `yourcompany.sharepoint.com`
- `SHAREPOINT_SITE_NAME` - e.g. `YourSiteName`
- `AUTH_FLOW` - `client_credentials` (default) or `on_behalf_of`

### 3. Run

**stdio transport** (for Claude Desktop):
```bash
npm start
```

**HTTP transport**:
```bash
npm run start:http
# Server starts on http://localhost:3000/mcp
```

## Claude Desktop Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "sharepoint": {
      "command": "node",
      "args": ["/path/to/sharepoint-mcp-nodejs/dist/index.js"],
      "env": {
        "AZURE_TENANT_ID": "your-tenant-id",
        "AZURE_CLIENT_ID": "your-client-id",
        "AZURE_CLIENT_SECRET": "your-client-secret",
        "SHAREPOINT_HOSTNAME": "yourcompany.sharepoint.com",
        "SHAREPOINT_SITE_NAME": "YourSiteName"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `List_SharePoint_Folders` | List folders in a directory |
| `Create_Folder` | Create a new folder |
| `Delete_Folder` | Delete a folder |
| `Get_SharePoint_Tree` | Recursive tree view (configurable depth) |
| `List_SharePoint_Documents` | List documents with metadata |
| `Get_Document_Content` | Download + extract text (PDF/Word/Excel/text) |
| `Upload_Document` | Upload from base64 or text content |
| `Upload_Document_From_Path` | Upload a local file (resumable for >4MB) |
| `Update_Document` | Update existing document content |
| `Delete_Document` | Delete a document |

## Upload Strategy

- **Files <= 4MB**: Simple PUT to `/content` endpoint
- **Files > 4MB**: Resumable upload session with 3.2MB chunks

## Auth Flows

### Client Credentials (default)
App-level access using client ID + secret. Best for server-to-server scenarios.

### On-Behalf-Of (OBO)
User-level access by exchanging a user token. Use with HTTP transport where the client sends a `Authorization: Bearer <token>` header.

See [docs/azure-setup.md](docs/azure-setup.md) for detailed Azure Portal setup instructions.

## Docker

After editing `.env` with your credentials, build and run with:

```bash
docker compose up --build -d
```

The server will be available at `http://localhost:3000/mcp`.

After making changes to the source, rebuild and restart (the Docker build compiles TypeScript internally):

```bash
docker compose up --build -d
```

To view logs:

```bash
docker compose logs -f
```

## Development

```bash
npm run dev    # Watch mode for TypeScript compilation
```

### Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```
