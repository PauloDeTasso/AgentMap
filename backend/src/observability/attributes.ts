export const ATTR_AGENTMAP_PROJECT_ID = 'agentmap.project.id';
export const ATTR_AGENTMAP_TASK_ID = 'agentmap.task.id';
export const ATTR_AGENTMAP_SESSION_ID = 'agentmap.session.id';
export const ATTR_AGENTMAP_CORRELATION_ID = 'agentmap.correlation.id';
export const ATTR_AGENTMAP_REQUEST_ID = 'agentmap.request.id';
export const ATTR_AGENTMAP_HANDOFF_ID = 'agentmap.handoff.id';
export const ATTR_AGENTMAP_AGENT_ID = 'agentmap.agent.id';

export interface AgentMapAttributes {
  projectId?: string;
  taskId?: string;
  sessionId?: string;
  correlationId?: string;
  requestId?: string;
  handoffId?: string;
  agentId?: string;
}

export function setAgentMapAttributes(span: any, attrs: AgentMapAttributes): void {
  if (attrs.projectId) span.setAttribute(ATTR_AGENTMAP_PROJECT_ID, attrs.projectId);
  if (attrs.taskId) span.setAttribute(ATTR_AGENTMAP_TASK_ID, attrs.taskId);
  if (attrs.sessionId) span.setAttribute(ATTR_AGENTMAP_SESSION_ID, attrs.sessionId);
  if (attrs.correlationId) span.setAttribute(ATTR_AGENTMAP_CORRELATION_ID, attrs.correlationId);
  if (attrs.requestId) span.setAttribute(ATTR_AGENTMAP_REQUEST_ID, attrs.requestId);
  if (attrs.handoffId) span.setAttribute(ATTR_AGENTMAP_HANDOFF_ID, attrs.handoffId);
  if (attrs.agentId) span.setAttribute(ATTR_AGENTMAP_AGENT_ID, attrs.agentId);
}
