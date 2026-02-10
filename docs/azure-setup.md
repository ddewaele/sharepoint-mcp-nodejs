# Azure Portal Setup Guide

This guide covers setting up an Azure AD App Registration for both Client Credentials and On-Behalf-Of (OBO) authentication flows.

## 1. Create App Registration

1. Go to [Azure Portal](https://portal.azure.com) > **Azure Active Directory** > **App registrations** > **New registration**
2. Set a name (e.g. "SharePoint MCP Server")
3. For **Supported account types**, select "Accounts in this organizational directory only"
4. Click **Register**

## 2. Note the IDs

From the app's **Overview** page, copy:
- **Application (client) ID** → `AZURE_CLIENT_ID`
- **Directory (tenant) ID** → `AZURE_TENANT_ID`

## 3. Create Client Secret

1. Go to **Certificates & secrets** > **Client secrets** > **New client secret**
2. Add a description and expiry
3. Copy the secret **Value** (not the ID) → `AZURE_CLIENT_SECRET`

## 4. Configure API Permissions

### For Client Credentials Flow

Go to **API permissions** > **Add a permission** > **Microsoft Graph** > **Application permissions**:

- `Sites.Read.All` - Read SharePoint sites
- `Sites.ReadWrite.All` - Read/write SharePoint sites
- `Files.ReadWrite.All` - Read/write files

Click **Grant admin consent** for your organization.

### For On-Behalf-Of (OBO) Flow

Go to **API permissions** > **Add a permission** > **Microsoft Graph** > **Delegated permissions**:

- `Sites.Read.All` - Read SharePoint sites
- `Sites.ReadWrite.All` - Read/write SharePoint sites
- `Files.ReadWrite.All` - Read/write files

Click **Grant admin consent** for your organization.

Additionally, for OBO:

1. Go to **Expose an API**
2. Set an **Application ID URI** (e.g. `api://<client-id>`)
3. Add a scope:
   - Scope name: `access_as_user`
   - Who can consent: **Admins and users**
   - Admin consent display name: "Access SharePoint as user"
   - Admin consent description: "Allow the application to access SharePoint on behalf of the signed-in user"
4. Under **Authorized client applications**, add the client app that will be sending user tokens

## 5. SharePoint Site

Identify your SharePoint site:
- **Hostname**: `yourcompany.sharepoint.com` → `SHAREPOINT_HOSTNAME`
- **Site name**: The site name from the URL (e.g. if URL is `https://yourcompany.sharepoint.com/sites/MySite`, the name is `MySite`) → `SHAREPOINT_SITE_NAME`

## Environment Variables Summary

```env
AZURE_TENANT_ID=<directory-tenant-id>
AZURE_CLIENT_ID=<application-client-id>
AZURE_CLIENT_SECRET=<client-secret-value>
SHAREPOINT_HOSTNAME=yourcompany.sharepoint.com
SHAREPOINT_SITE_NAME=MySite
AUTH_FLOW=client_credentials  # or on_behalf_of
HTTP_PORT=3000
```
