/* tslint:disable */
// @ts-nocheck
/* eslint-disable */
/**
 * API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


import * as runtime from '../runtime';
import type {
  SearchAutocompleteResponse,
  SearchFullResponse,
} from '../models';
import {
    SearchAutocompleteResponseFromJSON,
    SearchAutocompleteResponseToJSON,
    SearchFullResponseFromJSON,
    SearchFullResponseToJSON,
} from '../models';

export interface SearchRequest {
    offset?: number;
    limit?: number;
    userId?: string;
    query?: string;
    kind?: SearchKindEnum;
    includePurchaseable?: string;
    genre?: Array<string>;
    mood?: Array<string>;
    isVerified?: string;
    hasDownloads?: string;
    isPurchaseable?: string;
    key?: Array<string>;
    bpmMin?: string;
    bpmMax?: string;
    sortMethod?: SearchSortMethodEnum;
}

export interface SearchAutocompleteRequest {
    offset?: number;
    limit?: number;
    userId?: string;
    query?: string;
    kind?: SearchAutocompleteKindEnum;
    includePurchaseable?: string;
    genre?: Array<string>;
    mood?: Array<string>;
    isVerified?: string;
    hasDownloads?: string;
    isPurchaseable?: string;
    key?: Array<string>;
    bpmMin?: string;
    bpmMax?: string;
    sortMethod?: SearchAutocompleteSortMethodEnum;
}

/**
 * 
 */
export class SearchApi extends runtime.BaseAPI {

    /**
     * @hidden
     * Get Users/Tracks/Playlists/Albums that best match the search query
     */
    async searchRaw(params: SearchRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<SearchFullResponse>> {
        const queryParameters: any = {};

        if (params.offset !== undefined) {
            queryParameters['offset'] = params.offset;
        }

        if (params.limit !== undefined) {
            queryParameters['limit'] = params.limit;
        }

        if (params.userId !== undefined) {
            queryParameters['user_id'] = params.userId;
        }

        if (params.query !== undefined) {
            queryParameters['query'] = params.query;
        }

        if (params.kind !== undefined) {
            queryParameters['kind'] = params.kind;
        }

        if (params.includePurchaseable !== undefined) {
            queryParameters['includePurchaseable'] = params.includePurchaseable;
        }

        if (params.genre) {
            queryParameters['genre'] = params.genre;
        }

        if (params.mood) {
            queryParameters['mood'] = params.mood;
        }

        if (params.isVerified !== undefined) {
            queryParameters['is_verified'] = params.isVerified;
        }

        if (params.hasDownloads !== undefined) {
            queryParameters['has_downloads'] = params.hasDownloads;
        }

        if (params.isPurchaseable !== undefined) {
            queryParameters['is_purchaseable'] = params.isPurchaseable;
        }

        if (params.key) {
            queryParameters['key'] = params.key;
        }

        if (params.bpmMin !== undefined) {
            queryParameters['bpm_min'] = params.bpmMin;
        }

        if (params.bpmMax !== undefined) {
            queryParameters['bpm_max'] = params.bpmMax;
        }

        if (params.sortMethod !== undefined) {
            queryParameters['sort_method'] = params.sortMethod;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/search/full`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => SearchFullResponseFromJSON(jsonValue));
    }

    /**
     * Get Users/Tracks/Playlists/Albums that best match the search query
     */
    async search(params: SearchRequest = {}, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<SearchFullResponse> {
        const response = await this.searchRaw(params, initOverrides);
        return await response.value();
    }

    /**
     * @hidden
     * Same as search but optimized for quicker response at the cost of some entity information.
     * Get Users/Tracks/Playlists/Albums that best match the search query
     */
    async searchAutocompleteRaw(params: SearchAutocompleteRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<SearchAutocompleteResponse>> {
        const queryParameters: any = {};

        if (params.offset !== undefined) {
            queryParameters['offset'] = params.offset;
        }

        if (params.limit !== undefined) {
            queryParameters['limit'] = params.limit;
        }

        if (params.userId !== undefined) {
            queryParameters['user_id'] = params.userId;
        }

        if (params.query !== undefined) {
            queryParameters['query'] = params.query;
        }

        if (params.kind !== undefined) {
            queryParameters['kind'] = params.kind;
        }

        if (params.includePurchaseable !== undefined) {
            queryParameters['includePurchaseable'] = params.includePurchaseable;
        }

        if (params.genre) {
            queryParameters['genre'] = params.genre;
        }

        if (params.mood) {
            queryParameters['mood'] = params.mood;
        }

        if (params.isVerified !== undefined) {
            queryParameters['is_verified'] = params.isVerified;
        }

        if (params.hasDownloads !== undefined) {
            queryParameters['has_downloads'] = params.hasDownloads;
        }

        if (params.isPurchaseable !== undefined) {
            queryParameters['is_purchaseable'] = params.isPurchaseable;
        }

        if (params.key) {
            queryParameters['key'] = params.key;
        }

        if (params.bpmMin !== undefined) {
            queryParameters['bpm_min'] = params.bpmMin;
        }

        if (params.bpmMax !== undefined) {
            queryParameters['bpm_max'] = params.bpmMax;
        }

        if (params.sortMethod !== undefined) {
            queryParameters['sort_method'] = params.sortMethod;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/search/autocomplete`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => SearchAutocompleteResponseFromJSON(jsonValue));
    }

    /**
     * Same as search but optimized for quicker response at the cost of some entity information.
     * Get Users/Tracks/Playlists/Albums that best match the search query
     */
    async searchAutocomplete(params: SearchAutocompleteRequest = {}, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<SearchAutocompleteResponse> {
        const response = await this.searchAutocompleteRaw(params, initOverrides);
        return await response.value();
    }

}

/**
 * @export
 */
export const SearchKindEnum = {
    All: 'all',
    Users: 'users',
    Tracks: 'tracks',
    Playlists: 'playlists',
    Albums: 'albums'
} as const;
export type SearchKindEnum = typeof SearchKindEnum[keyof typeof SearchKindEnum];
/**
 * @export
 */
export const SearchSortMethodEnum = {
    Relevant: 'relevant',
    Popular: 'popular',
    Recent: 'recent'
} as const;
export type SearchSortMethodEnum = typeof SearchSortMethodEnum[keyof typeof SearchSortMethodEnum];
/**
 * @export
 */
export const SearchAutocompleteKindEnum = {
    All: 'all',
    Users: 'users',
    Tracks: 'tracks',
    Playlists: 'playlists',
    Albums: 'albums'
} as const;
export type SearchAutocompleteKindEnum = typeof SearchAutocompleteKindEnum[keyof typeof SearchAutocompleteKindEnum];
/**
 * @export
 */
export const SearchAutocompleteSortMethodEnum = {
    Relevant: 'relevant',
    Popular: 'popular',
    Recent: 'recent'
} as const;
export type SearchAutocompleteSortMethodEnum = typeof SearchAutocompleteSortMethodEnum[keyof typeof SearchAutocompleteSortMethodEnum];
