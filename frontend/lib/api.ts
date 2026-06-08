const BASE = "http://localhost:8080";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("archon_auth_token");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function apiSignup(email: string, password: string) {
  const res = await fetch(`${BASE}/api/v1/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

export async function apiLogin(email: string, password: string): Promise<string> {
  const data = await request<{ token: string }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return data.token;
}

// ── Projects ─────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  repo_url: string;
  branch: string;
  owner_id: string;
  workspace_id?: string;
  created_at: string;
}

export async function apiListProjects(): Promise<Project[]> {
  return request<Project[]>("/api/v1/projects");
}

export async function apiCreateProject(name: string): Promise<Project> {
  return request<Project>("/api/v1/projects", {
    method: "POST",
    body: JSON.stringify({ name, repo_url: "https://github.com/placeholder/repo", branch: "main" }),
  });
}

export async function apiGetProject(projectId: string): Promise<Project> {
  return request<Project>(`/api/v1/projects/${projectId}`);
}

// ── Designs ──────────────────────────────────────────────────────────────────

export interface Design {
  id: string;
  project_id: string;
  thread_id: string;
  status: string;
  prd: string;
  provider: string;
  model?: string;
  project_model?: string;        // JSON string
  architecture_model?: string;   // JSON string
  database_model?: string;       // JSON string
  openapi_model?: string;        // JSON string
  backlog_model?: string;        // JSON string
  requirements_doc?: string;
  interrupt_type?: string;
  interrupt_payload?: string;    // JSON string
  created_at: string;
  updated_at: string;
}

export async function apiCreateDesign(
  projectId: string,
  prd: string,
  provider: string,
  model?: string
): Promise<Design> {
  return request<Design>(`/api/v1/projects/${projectId}/designs`, {
    method: "POST",
    body: JSON.stringify({ prd, provider, model: model || undefined }),
  });
}

export async function apiGetDesign(designId: string): Promise<Design> {
  return request<Design>(`/api/v1/designs/${designId}`);
}

export async function apiListDesigns(projectId: string): Promise<Design[]> {
  return request<Design[]>(`/api/v1/projects/${projectId}/designs`);
}

export async function apiResumeDesign(
  designId: string,
  action: string,
  payload: Record<string, unknown>
): Promise<Design> {
  return request<Design>(`/api/v1/designs/${designId}/resume`, {
    method: "POST",
    body: JSON.stringify({ action, payload }),
  });
}

export async function apiDownloadFile(designId: string, filename: string) {
  const token = getToken();
  const res = await fetch(`${BASE}/api/v1/designs/${designId}/export/file?name=${encodeURIComponent(filename)}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function apiDownloadZip(designId: string) {
  const token = getToken();
  const res = await fetch(`${BASE}/api/v1/designs/${designId}/export`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `archon-design-${designId.slice(0, 8)}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function apiGenerateBacklog(
  designId: string,
  feedback?: string
): Promise<Design> {
  return request<Design>(`/api/v1/designs/${designId}/backlog`, {
    method: "POST",
    body: JSON.stringify({ feedback: feedback || "" }),
  });
}

// ── Workspaces ────────────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  email: string;
  role: "owner" | "member";
  joined_at: string;
}

export async function apiListWorkspaces(): Promise<Workspace[]> {
  return request<Workspace[]>("/api/v1/workspaces");
}

export async function apiCreateWorkspace(name: string): Promise<Workspace> {
  return request<Workspace>("/api/v1/workspaces", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function apiGetWorkspace(id: string): Promise<Workspace> {
  return request<Workspace>(`/api/v1/workspaces/${id}`);
}

export async function apiListWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  return request<WorkspaceMember[]>(`/api/v1/workspaces/${workspaceId}/members`);
}

export async function apiAddWorkspaceMember(workspaceId: string, email: string): Promise<WorkspaceMember> {
  return request<WorkspaceMember>(`/api/v1/workspaces/${workspaceId}/members`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function apiRemoveWorkspaceMember(workspaceId: string, userId: string): Promise<void> {
  return request<void>(`/api/v1/workspaces/${workspaceId}/members/${userId}`, {
    method: "DELETE",
  });
}

export async function apiListWorkspaceProjects(workspaceId: string): Promise<Project[]> {
  return request<Project[]>(`/api/v1/workspaces/${workspaceId}/projects`);
}

// ── Task Assignments ──────────────────────────────────────────────────────────

export interface TaskAssignment {
  id: string;
  design_id: string;
  epic_name: string;
  story_name: string;
  task_title: string;
  assignee_id: string;
  assignee_email: string;
  assigned_by: string;
  status: "todo" | "in_progress" | "done";
  created_at: string;
  updated_at: string;
  // Enrichment fields (My Tasks view)
  project_id?: string;
  project_name?: string;
  workspace_name?: string;
}

export async function apiListDesignTasks(designId: string): Promise<TaskAssignment[]> {
  return request<TaskAssignment[]>(`/api/v1/designs/${designId}/tasks`);
}

export async function apiAssignTask(
  designId: string,
  epicName: string,
  storyName: string,
  taskTitle: string,
  assigneeId: string
): Promise<TaskAssignment> {
  return request<TaskAssignment>(`/api/v1/designs/${designId}/tasks/assign`, {
    method: "POST",
    body: JSON.stringify({ epic_name: epicName, story_name: storyName, task_title: taskTitle, assignee_id: assigneeId }),
  });
}

export async function apiUnassignTask(
  designId: string,
  epicName: string,
  storyName: string,
  taskTitle: string
): Promise<void> {
  return request<void>(`/api/v1/designs/${designId}/tasks/assign`, {
    method: "DELETE",
    body: JSON.stringify({ epic_name: epicName, story_name: storyName, task_title: taskTitle }),
  });
}

export async function apiUpdateTaskStatus(
  designId: string,
  epicName: string,
  storyName: string,
  taskTitle: string,
  status: "todo" | "in_progress" | "done"
): Promise<TaskAssignment> {
  return request<TaskAssignment>(`/api/v1/designs/${designId}/tasks/status`, {
    method: "PATCH",
    body: JSON.stringify({ epic_name: epicName, story_name: storyName, task_title: taskTitle, status }),
  });
}

export async function apiListMyTasks(): Promise<TaskAssignment[]> {
  return request<TaskAssignment[]>("/api/v1/me/tasks");
}
