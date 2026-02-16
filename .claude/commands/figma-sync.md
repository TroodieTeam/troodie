# Figma MCP Sync

Sync ScreenSync release artifacts to Figma using MCP tools. This command runs locally (not in CI) and uses the Figma MCP for richer integration than the REST API alone.

## Instructions

You are running the ScreenSync Figma sync locally via MCP. Follow these steps precisely:

### Step 1 — Load the sync payload

Read the latest MCP sync payload from `artifacts/figma-mcp/`. Look for the most recent `mcp-sync-*.json` file. If an argument was provided (e.g., `/figma-sync v1.2.3`), use that specific version.

Read the payload file to get:
- `figmaFileKey` — the Figma file to sync to
- `figmaPageId` — the page within the file
- `screenshots` — list of screenshots with file paths
- `documentation` — release notes and change summaries
- `flows` — Mermaid flow diagrams to create
- `codeConnectMappings` — screen-to-code mappings

If no payload is found, tell the user to run `screensync release` or `screensync baseline` first to generate artifacts.

### Step 2 — Read existing Figma structure

Use `mcp__figma__get_metadata` with the `figmaFileKey` and `figmaPageId` from the payload to understand the current file structure. Look for:
- An existing "ScreenSync Docs" page/section
- Previous release frames to understand the layout pattern
- Node IDs we might need to update

### Step 3 — Create flow diagrams in FigJam

For each entry in the `flows` array, use `mcp__figma__generate_diagram` to create a visual flow diagram:
- Use the `name` field as the diagram title
- Use the `mermaidSyntax` field as the Mermaid code
- Present each returned URL to the user

### Step 4 — Upload screenshots via REST API

For each screenshot in the payload, upload it to Figma using the REST API:

```
POST https://api.figma.com/v1/images/{fileKey}
Headers: X-Figma-Token: {FIGMA_ACCESS_TOKEN}, Content-Type: image/png
Body: <image binary>
```

Use the Bash tool to execute curl commands for each screenshot upload.

### Step 5 — Create Code Connect mappings

For each entry in `codeConnectMappings`, use `mcp__figma__add_code_connect_map` to link Figma nodes to source code:
- `fileKey` from the payload
- `nodeId` from any matched nodes found in Step 2
- `source` from the mapping's `sourcePath`
- `componentName` from the mapping's `componentName`
- `label` should be "React"

Only create mappings for nodes that were found in the metadata scan.

### Step 6 — Generate release screenshot of the synced page

After all uploads, use `mcp__figma__get_screenshot` to capture a screenshot of the updated page and show it to the user for verification.

### Step 7 — Report results

Print a summary:
- How many screenshots were uploaded
- How many flow diagrams were created (with FigJam URLs)
- How many code connect mappings were established
- Link to the Figma file

## Error Handling

- If `FIGMA_ACCESS_TOKEN` is not set, prompt the user to set it
- If MCP tools are unavailable, fall back to writing the JSON payload only
- If individual uploads fail, continue with remaining screenshots and report failures at the end

## Arguments

- Optional: version string (e.g., `v1.2.3`) to sync a specific release
- If no version specified, syncs the latest available payload
