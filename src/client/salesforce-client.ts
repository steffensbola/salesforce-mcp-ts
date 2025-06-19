/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import {
  SalesforceConfig,
  SalesforceQueryResult,
  SalesforceRecord,
  SalesforceObjectMetadata,
  SalesforceCreateResult,
  SalesforceField,
} from '../types/salesforce.js';
import { SalesforcePasswordAuth } from '../auth/password-auth.js';
import { getApiUrl } from '../config/config.js';
import { debugLog, errorLog } from '../utils/debug-log.js';

/**
 * Main Salesforce client that handles operations and caching
 */
export class SalesforceClient {
  private readonly config: SalesforceConfig;
  private authClient: SalesforcePasswordAuth | null = null;
  private readonly sobjectsCache: Map<string, SalesforceField[]> = new Map();

  constructor(config: SalesforceConfig) {
    this.config = config;
  }

  /**
   * Establishes connection to Salesforce using authentication methods
   * Priority order:
   * 1. Environment variables (access token + instance URL)
   * 2. Username/Password with OAuth credentials
   */
  async connect(): Promise<boolean> {
    try {
      return (
        (await this.tryAccessTokenAuth()) ||
        (await this.tryUsernamePasswordAuth()) ||
        this.handleAuthFailure()
      );
    } catch (error) {
      errorLog('Salesforce connection failed:', this.getErrorMessage(error));
      return this.tryTokenRefresh();
    }
  }

  /**
   * Try authentication using access token from configuration
   */
  private async tryAccessTokenAuth(): Promise<boolean> {
    if (this.config.accessToken && this.config.instanceUrl) {
      debugLog('🔑 Using access token from environment variables...');

      // Test the token by making a simple API call
      try {
        await this.makeRequest('GET', '/sobjects');
        debugLog('✅ Access token authentication successful!');
        return true;
      } catch (error) {
        errorLog('❌ Access token is invalid or expired', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Try username/password authentication with OAuth flow
   */
  private async tryUsernamePasswordAuth(): Promise<boolean> {
    if (
      this.config.username &&
      this.config.password &&
      this.config.clientId &&
      this.config.clientSecret
    ) {
      debugLog('🔐 Using username/password authentication with OAuth flow...');

      this.authClient = new SalesforcePasswordAuth(this.config.clientId, this.config.clientSecret);

      const success = await this.authClient.authenticate(
        this.config.username,
        this.config.password,
        this.config.securityToken ?? '',
        this.config.sandbox
      );

      if (success) {
        // Update config with the obtained tokens
        this.config.accessToken = this.authClient.accessToken!;
        this.config.instanceUrl = this.authClient.instanceUrl!;
        return true;
      }
      errorLog('❌ Username/password authentication failed');
      return false;
    }
    return false;
  }

  /**
   * Handle the case when no authentication method is available
   */
  private handleAuthFailure(): boolean {
    errorLog('❌ No valid authentication method found. Please set one of:');
    errorLog('1. SALESFORCE_ACCESS_TOKEN + SALESFORCE_INSTANCE_URL');
    errorLog(
      '2. SALESFORCE_USERNAME + SALESFORCE_PASSWORD + SALESFORCE_CLIENT_ID + SALESFORCE_CLIENT_SECRET'
    );
    return false;
  }

  /**
   * Try refreshing token if OAuth was used
   */
  private async tryTokenRefresh(): Promise<boolean> {
    if (this.authClient?.refreshToken) {
      debugLog('🔄 Attempting to refresh access token...');

      if (await this.authClient.refreshAccessToken(this.config.sandbox)) {
        this.config.accessToken = this.authClient.accessToken!;
        this.config.instanceUrl = this.authClient.instanceUrl!;
        return true;
      }
      errorLog('❌ Token refresh failed');
    }
    return false;
  }

  /**
   * Make authenticated request to Salesforce API
   */
  async makeRequest<T = unknown>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    data?: unknown,
    params?: Record<string, unknown>
  ): Promise<T> {
    if (!this.config.accessToken || !this.config.instanceUrl) {
      throw new Error('Not authenticated. Call connect() first.');
    }

    const url = getApiUrl(this.config.instanceUrl, path);

    const config: AxiosRequestConfig = {
      method,
      url,
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      params,
      data,
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      //eslint-disable-next-line no-magic-numbers
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        // Token might be expired, try to refresh
        if (await this.tryTokenRefresh()) {
          // Retry the request with new token
          config.headers!.Authorization = `Bearer ${this.config.accessToken}`;
          const retryResponse = await axios(config);
          return retryResponse.data;
        }
      }
      throw this.handleRequestError(error);
    }
  }

  /**
   * Execute SOQL query
   */
  async query<T = SalesforceRecord>(query: string): Promise<SalesforceQueryResult<T>> {
    return this.makeRequest('GET', '/query', undefined, { q: query });
  }

  /**
   * Execute SOQL query with all records (handles pagination)
   */
  async queryAll<T = SalesforceRecord>(query: string): Promise<SalesforceQueryResult<T>> {
    const result = await this.query<T>(query);

    // If there are more records, fetch them
    while (!result.done && result.nextRecordsUrl) {
      const nextResult = await this.makeRequest<SalesforceQueryResult<T>>(
        'GET',
        result.nextRecordsUrl.replace(`/services/data/v58.0`, '')
      );
      result.records.push(...nextResult.records);
      result.done = nextResult.done;
      result.nextRecordsUrl = nextResult.nextRecordsUrl;
      result.totalSize = nextResult.totalSize;
    }

    return result;
  }

  /**
   * Execute SOSL search
   */
  async search<T = SalesforceRecord>(searchQuery: string): Promise<T[]> {
    const result = await this.makeRequest<{ searchRecords?: T[] }>('GET', '/search', undefined, {
      q: searchQuery,
    });
    return result.searchRecords ?? [];
  }

  /**
   * Get object metadata including fields
   */
  async getObjectFields(objectName: string): Promise<SalesforceField[]> {
    // Check cache first
    if (this.sobjectsCache.has(objectName)) {
      return this.sobjectsCache.get(objectName)!;
    }

    const metadata = await this.makeRequest<SalesforceObjectMetadata>(
      'GET',
      `/sobjects/${objectName}/describe`
    );

    const filteredFields: SalesforceField[] = metadata.fields.map(field => ({
      label: field.label,
      name: field.name,
      updateable: field.updateable,
      type: field.type,
      length: field.length,
      picklistValues: field.picklistValues,
    }));

    // Cache the result
    this.sobjectsCache.set(objectName, filteredFields);

    return filteredFields;
  }

  /**
   * Get a specific record by ID
   */
  async getRecord<T = SalesforceRecord>(
    objectName: string,
    recordId: string,
    fields?: string[]
  ): Promise<T> {
    let path = `/sobjects/${objectName}/${recordId}`;

    if (fields && fields.length > 0) {
      path += `?fields=${fields.join(',')}`;
    }

    return this.makeRequest('GET', path);
  }

  /**
   * Create a new record
   */
  async createRecord(
    objectName: string,
    data: Record<string, any>
  ): Promise<SalesforceCreateResult> {
    return this.makeRequest('POST', `/sobjects/${objectName}`, data);
  }

  /**
   * Update an existing record
   */
  async updateRecord(
    objectName: string,
    recordId: string,
    data: Record<string, any>
  ): Promise<boolean> {
    await this.makeRequest('PATCH', `/sobjects/${objectName}/${recordId}`, data);
    return true;
  }

  /**
   * Delete a record
   */
  async deleteRecord(objectName: string, recordId: string): Promise<boolean> {
    await this.makeRequest('DELETE', `/sobjects/${objectName}/${recordId}`);
    return true;
  }

  /**
   * Execute Tooling API request
   */
  async toolingExecute<T = any>(
    action: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    data?: any
  ): Promise<T> {
    if (!this.config.instanceUrl) {
      throw new Error('Not authenticated. Call connect() first.');
    }

    const url = `${this.config.instanceUrl}/services/data/v58.0/tooling/${action}`;

    const config: AxiosRequestConfig = {
      method,
      url,
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      data,
    };

    const response = await axios(config);
    return response.data;
  }

  /**
   * Execute Apex REST request
   */
  async apexExecute<T = any>(
    action: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    data?: any
  ): Promise<T> {
    if (!this.config.instanceUrl) {
      throw new Error('Not authenticated. Call connect() first.');
    }

    const cleanAction = action.startsWith('/') ? action : `/${action}`;
    const url = `${this.config.instanceUrl}/services/apexrest${cleanAction}`;

    const config: AxiosRequestConfig = {
      method,
      url,
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      data,
    };

    const response = await axios(config);
    return response.data;
  }

  /**
   * Make a direct REST API call
   */
  async restful<T = any>(
    path: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    params?: Record<string, any>,
    data?: any
  ): Promise<T> {
    return this.makeRequest(method, path, data, params);
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.config.accessToken && this.config.instanceUrl);
  }

  /**
   * Get the current instance URL
   */
  getInstanceUrl(): string | null {
    return this.config.instanceUrl ?? null;
  }

  /**
   * Handle request errors
   */
  private handleRequestError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        const errorData = axiosError.response.data as any;
        const message =
          errorData?.message ?? errorData?.[0]?.message ?? `HTTP ${axiosError.response.status}`;
        return new Error(`Salesforce API Error: ${message}`);
      } else if (axiosError.request) {
        return new Error('Network error: Unable to reach Salesforce API');
      }
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error('Unknown error occurred');
  }

  /**
   * Get error message from unknown error type
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error occurred';
  }
}
