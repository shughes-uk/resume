/* tslint:disable */
/* eslint-disable */
/**
 * NinjaAPI
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 1.0.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


import * as runtime from '../runtime';
import type {
  HealthCheckSchema,
  SocialLoginSchema,
  UserSchema,
} from '../models/index';
import {
    HealthCheckSchemaFromJSON,
    HealthCheckSchemaToJSON,
    SocialLoginSchemaFromJSON,
    SocialLoginSchemaToJSON,
    UserSchemaFromJSON,
    UserSchemaToJSON,
} from '../models/index';

export interface ApiViewsAuthGithubLoginRequest {
    socialLoginSchema: SocialLoginSchema;
}

export interface ApiViewsAuthGoogleLoginRequest {
    socialLoginSchema: SocialLoginSchema;
}

/**
 * 
 */
export class DefaultApi extends runtime.BaseAPI {

    /**
     * Hello
     */
    async apiApiHelloRaw(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<HealthCheckSchema>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/api/healthcheck`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => HealthCheckSchemaFromJSON(jsonValue));
    }

    /**
     * Hello
     */
    async apiApiHello(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<HealthCheckSchema> {
        const response = await this.apiApiHelloRaw(initOverrides);
        return await response.value();
    }

    /**
     * Github Login
     */
    async apiViewsAuthGithubLoginRaw(requestParameters: ApiViewsAuthGithubLoginRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<UserSchema>> {
        if (requestParameters['socialLoginSchema'] == null) {
            throw new runtime.RequiredError(
                'socialLoginSchema',
                'Required parameter "socialLoginSchema" was null or undefined when calling apiViewsAuthGithubLogin().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/api/auth/github-login`,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: SocialLoginSchemaToJSON(requestParameters['socialLoginSchema']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => UserSchemaFromJSON(jsonValue));
    }

    /**
     * Github Login
     */
    async apiViewsAuthGithubLogin(requestParameters: ApiViewsAuthGithubLoginRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<UserSchema> {
        const response = await this.apiViewsAuthGithubLoginRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Google Login
     */
    async apiViewsAuthGoogleLoginRaw(requestParameters: ApiViewsAuthGoogleLoginRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<UserSchema>> {
        if (requestParameters['socialLoginSchema'] == null) {
            throw new runtime.RequiredError(
                'socialLoginSchema',
                'Required parameter "socialLoginSchema" was null or undefined when calling apiViewsAuthGoogleLogin().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/api/auth/google-login`,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: SocialLoginSchemaToJSON(requestParameters['socialLoginSchema']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => UserSchemaFromJSON(jsonValue));
    }

    /**
     * Google Login
     */
    async apiViewsAuthGoogleLogin(requestParameters: ApiViewsAuthGoogleLoginRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<UserSchema> {
        const response = await this.apiViewsAuthGoogleLoginRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Log Out
     */
    async apiViewsAuthLogOutRaw(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<void>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/api/auth/log-out`,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.VoidApiResponse(response);
    }

    /**
     * Log Out
     */
    async apiViewsAuthLogOut(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<void> {
        await this.apiViewsAuthLogOutRaw(initOverrides);
    }

    /**
     * Identify
     */
    async apiViewsUserIdentifyRaw(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<UserSchema>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/api/user/me`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => UserSchemaFromJSON(jsonValue));
    }

    /**
     * Identify
     */
    async apiViewsUserIdentify(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<UserSchema> {
        const response = await this.apiViewsUserIdentifyRaw(initOverrides);
        return await response.value();
    }

}
