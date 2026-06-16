const GITHUB_OWNER = process.env.GITHUB_WORKFLOWS_OWNER!;
const GITHUB_REPO = process.env.GITHUB_WORKFLOWS_REPO!;
const GITHUB_PAT = process.env.GITHUB_ACTIONS_PAT!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!;

export const TOTAL_SERVER_WORKFLOWS = 12;

export interface TriggerServerWorkflowParams {
  workflowNumber: number;
  projectId: string;
  repoUrl: string;
  pat: string;
  envB64: string;
  runCommand: string;
  port: number;
  cfWorkersKey?: string;
}

/** Trigger a numbered server workflow via the GitHub API */
export async function triggerServerWorkflow(params: TriggerServerWorkflowParams) {
  const { workflowNumber, projectId, repoUrl, pat, envB64, runCommand, port, cfWorkersKey } = params;
  const workflowFile = `server-${workflowNumber}.yml`;

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${workflowFile}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_PAT}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          project_id: projectId,
          repo_url: repoUrl,
          pat,
          env_b64: envB64,
          run_command: runCommand,
          port: String(port),
          webhook_url: `${APP_URL}/api/webhook/update-link`,
          webhook_secret: WEBHOOK_SECRET,
          cf_workers_key: cfWorkersKey ?? "",
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${text}`);
  }

  return true;
}

/** Cancel a workflow run */
export async function cancelWorkflowRun(runId: string) {
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs/${runId}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_PAT}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  return response.ok;
}

/** Get the latest run ID for a workflow */
export async function getLatestWorkflowRunId(workflowNumber: number): Promise<string | null> {
  const workflowFile = `server-${workflowNumber}.yml`;
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${workflowFile}/runs?per_page=1&status=in_progress`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_PAT}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  if (!response.ok) return null;
  const data = await response.json();
  return data.workflow_runs?.[0]?.id?.toString() ?? null;
}

/** Trigger the master workflow for initial deployment */
export async function triggerMasterWorkflow(params: {
  action: "deploy_new";
  projectId: string;
  repoUrl: string;
  pat: string;
  envB64: string;
  runCommand: string;
  port: number;
  cfWorkersKey?: string;
}) {
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/master.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_PAT}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          action: params.action,
          project_id: params.projectId,
          repo_url: params.repoUrl,
          pat: params.pat,
          env_b64: params.envB64,
          run_command: params.runCommand,
          port: String(params.port),
          cf_workers_key: params.cfWorkersKey ?? "",
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${text}`);
  }

  return true;
}

/** Convert env vars array to base64-encoded .env file content */
export function envVarsToBase64(envVars: Array<{ key: string; value: string }>): string {
  const content = envVars.map(({ key, value }) => `${key}=${value}`).join("\n");
  return Buffer.from(content).toString("base64");
}
