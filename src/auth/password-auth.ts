import axios, { AxiosError } from 'axios';
import { SalesforceAuthResponse, SalesforceTokenRefreshResponse } from '../types/salesforce.js';
import { getOAuthTokenUrl } from '../config/config.js';
import { debugLog } from '../utils/debug-log.js';

/**
 * Handles Salesforce password-based authentication using OAuth 2.0 Resource Owner Password Credentials Flow
 */
export class SalesforcePasswordAuth {
  private clientId: string;
  private clientSecret: string;

  public accessToken: string | null = null;
  public instanceUrl: string | null = null;
  public refreshToken: string | null = null;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Authenticate using Resource Owner Password Credentials Flow (username/password)
   */
  async authenticate(
    username: string,
    password: string,
    securityToken: string = '',
    sandbox: boolean = false
  ): Promise<boolean> {
    try {
      const tokenUrl = getOAuthTokenUrl(sandbox);

      // Combine password and security token
      const combinedPassword = securityToken ? `${password}${securityToken}` : password;

      const data = new URLSearchParams({
        grant_type: 'password',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        username: username,
        password: combinedPassword,
      });

      debugLog('🔐 Authenticating with Salesforce using password flow...');

      const response = await axios.post<SalesforceAuthResponse>(tokenUrl, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      //eslint-disable-next-line no-magic-numbers
      if (response.status === 200) {
        this.accessToken = response.data.access_token;
        this.instanceUrl = response.data.instance_url;
        this.refreshToken = response.data.refresh_token ?? null;

        debugLog('✅ Authentication successful!');
        debugLog(`   Instance URL: ${this.instanceUrl}`);
        return true;
      }
      console.error(`❌ Authentication failed: ${response.status}`);
      console.error(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      return false;
    } catch (error) {
      this.handleAuthError(error);
      return false;
    }
  }

  /**
   * Refresh the access token using refresh token
   */
  async refreshAccessToken(sandbox: boolean = false): Promise<boolean> {
    if (!this.refreshToken) {
      console.error('❌ No refresh token available');
      return false;
    }

    try {
      const tokenUrl = getOAuthTokenUrl(sandbox);

      const data = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
      });

      debugLog('🔄 Refreshing access token...');

      const response = await axios.post<SalesforceTokenRefreshResponse>(tokenUrl, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (response.status === 200) {
        this.accessToken = response.data.access_token;
        this.instanceUrl = response.data.instance_url;

        debugLog('✅ Token refresh successful!');
        return true;
      }
      console.error(`❌ Token refresh failed: ${response.status}`);
      console.error(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      return false;
    } catch (error) {
      console.error('❌ Token refresh error:', this.getErrorMessage(error));
      return false;
    }
  }

  /**
   * Check if the authentication is valid
   */
  isAuthenticated(): boolean {
    return !!(this.accessToken && this.instanceUrl);
  }

  /**
   * Clear authentication data
   */
  clearAuth(): void {
    this.accessToken = null;
    this.instanceUrl = null;
    this.refreshToken = null;
  }

  /**
   * Handle authentication errors with detailed messages
   */
  private handleAuthError(error: unknown): void {
    const message = this.getErrorMessage(error);
    console.error('❌ Authentication error:', message);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        console.error(`   Status: ${axiosError.response.status}`);
        console.error(`   Response: ${JSON.stringify(axiosError.response.data, null, 2)}`);

        // Provide specific guidance based on error

        if (axiosError.response.status === 400) {
          console.error('   💡 Common fixes:');
          console.error('      - Check username and password are correct');
          console.error('      - Verify security token if required');
          console.error('      - Ensure Connected App has correct OAuth scopes');
          console.error('      - For sandbox, make sure sandbox=true');
        }
      } else if (axiosError.request) {
        console.error('   💡 Network error - check your internet connection');
      }
    }
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
