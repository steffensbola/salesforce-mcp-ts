/**
 * Configuration interfaces for the MCP Salesforce connector
 */
type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

// Base record data interface for CRUD operations
export interface SalesforceRecordData {
  [key: string]: string | number | boolean | null | undefined;
}

// API request parameters interface
export interface SalesforceApiParams {
  [key: string]: string | number | boolean | null | undefined;
}

// SOSL search result interface
export interface SalesforceSearchResult {
  searchRecords: SalesforceRecord[];
}

export interface SalesforceConfig {
  clientId: string;
  clientSecret: string;
  username?: string;
  password?: string;
  securityToken?: string;
  sandbox: boolean;
  accessToken?: string;
  instanceUrl?: string;
}

export interface SalesforceAuthResponse {
  access_token: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
  refresh_token?: string;
}

export interface SalesforceTokenRefreshResponse {
  access_token: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
}
//eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SalesforceQueryResult<T = any> {
  totalSize: number;
  done: boolean;
  records: T[];
  nextRecordsUrl?: string;
}

export interface SalesforceRecord {
  Id: string;
  attributes: {
    type: string;
    url: string;
  };
  [key: string]: unknown;
}

export interface SalesforceField {
  label: string;
  name: string;
  updateable: boolean;
  type: string;
  length: number;
  picklistValues: Array<{
    label: string;
    value: string;
    active: boolean;
    defaultValue: boolean;
  }>;
}

export interface SalesforceObjectMetadata {
  fields: SalesforceField[];
  label: string;
  name: string;
  queryable: boolean;
  createable: boolean;
  updateable: boolean;
  deletable: boolean;
}

export interface SalesforceCreateResult {
  id: string;
  success: boolean;
  errors: Array<{
    statusCode: string;
    message: string;
    fields: string[];
  }>;
}

export interface SalesforceError {
  message: string;
  errorCode: string;
  fields?: string[];
}

export interface ToolAuthenticatePasswordArgs {
  username: string;
  password: string;
  security_token?: string;
  sandbox?: boolean;
}

export interface ToolSoqlQueryArgs {
  query: string;
}

export interface ToolSoslSearchArgs {
  search: string;
}

export interface ToolGetObjectFieldsArgs {
  object_name: string;
}

export interface ToolGetRecordArgs {
  object_name: string;
  record_id: string;
}

export interface ToolCreateRecordArgs {
  object_name: string;
  data: SalesforceRecordData;
}

export interface ToolUpdateRecordArgs {
  object_name: string;
  record_id: string;
  data: SalesforceRecordData;
}

export interface ToolDeleteRecordArgs {
  object_name: string;
  record_id: string;
}

export interface ToolToolingExecuteArgs {
  action: string;
  method?: HttpMethod;
  data?: SalesforceRecordData;
}

export interface ToolApexExecuteArgs {
  action: string;
  method?: HttpMethod;
  data?: SalesforceRecordData;
}

export interface ToolRestfulArgs {
  path: string;
  method?: HttpMethod;
  params?: SalesforceApiParams;
  data?: SalesforceRecordData;
}
