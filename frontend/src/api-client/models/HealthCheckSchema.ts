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

import { mapValues } from '../runtime';
/**
 * 
 * @export
 * @interface HealthCheckSchema
 */
export interface HealthCheckSchema {
    /**
     * 
     * @type {string}
     * @memberof HealthCheckSchema
     */
    message: string;
}

/**
 * Check if a given object implements the HealthCheckSchema interface.
 */
export function instanceOfHealthCheckSchema(value: object): boolean {
    if (!('message' in value)) return false;
    return true;
}

export function HealthCheckSchemaFromJSON(json: any): HealthCheckSchema {
    return HealthCheckSchemaFromJSONTyped(json, false);
}

export function HealthCheckSchemaFromJSONTyped(json: any, ignoreDiscriminator: boolean): HealthCheckSchema {
    if (json == null) {
        return json;
    }
    return {
        
        'message': json['message'],
    };
}

export function HealthCheckSchemaToJSON(value?: HealthCheckSchema | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'message': value['message'],
    };
}
