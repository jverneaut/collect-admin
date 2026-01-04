import type {
  BaseRecord,
  CreateParams,
  CreateResponse,
  DataProvider,
  CustomParams,
  CustomResponse,
  DeleteOneParams,
  DeleteOneResponse,
  GetListParams,
  GetListResponse,
  GetOneParams,
  GetOneResponse,
  HttpError,
  UpdateParams,
  UpdateResponse,
} from "@refinedev/core";

type ApiEnvelope<T> = { ok: true; data: T; meta?: unknown } | { ok: false; error: { code: string; message: string; details?: unknown } };

function isApiError<T>(value: ApiEnvelope<T>): value is { ok: false; error: { code: string; message: string; details?: unknown } } {
  return (value as { ok?: boolean }).ok === false;
}

function toHttpError(error: unknown, statusCode?: number): HttpError {
  if (typeof error === "object" && error && "message" in error && typeof (error as { message: unknown }).message === "string") {
    return { message: (error as { message: string }).message, statusCode: statusCode ?? 500 };
  }
  return { message: "Unexpected error", statusCode: statusCode ?? 500 };
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || isApiError(payload)) {
    const message = isApiError(payload) ? payload.error.message : "Request failed";
    const err: HttpError = { message, statusCode: response.status };
    throw err;
  }

  return payload.data;
}

function isApiEnvelope(value: unknown): value is { ok: boolean } {
  return typeof value === "object" && value !== null && "ok" in value && typeof (value as { ok: unknown }).ok === "boolean";
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, string | number | boolean | undefined | null>) {
  const url = new URL(path, baseUrl);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function getSearchFilter(params: GetListParams) {
  const fromFilters = params.filters?.find((f) => "field" in f && (f.field === "search" || f.field === "q" || f.field === "host"));
  if (!fromFilters || !("value" in fromFilters)) return undefined;
  if (typeof fromFilters.value !== "string") return undefined;
  const trimmed = fromFilters.value.trim();
  return trimmed.length ? trimmed : undefined;
}

export function collectApiDataProvider(baseUrl: string): DataProvider {
  return {
    getList: async <TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResponse<TData>> => {
      try {
        if (params.resource === "domains") {
          const search = getSearchFilter(params);
          const data = await requestJson<{ items: TData[] }>(
            buildUrl(baseUrl, "/domains", { limit: 100, includeHomepage: true, ...(search ? { search } : {}) })
          );
          return { data: data.items, total: data.items.length };
        }

        if (params.resource === "categories") {
          const data = await requestJson<{ items: TData[] }>(buildUrl(baseUrl, "/categories"));
          return { data: data.items, total: data.items.length };
        }

        if (params.resource === "technologies") {
          const data = await requestJson<{ items: TData[] }>(buildUrl(baseUrl, "/technologies"));
          return { data: data.items, total: data.items.length };
        }

        if (params.resource === "jobs") {
          const data = await requestJson<{ items: TData[] }>(buildUrl(baseUrl, "/jobs"));
          return { data: data.items, total: data.items.length };
        }

        if (params.resource === "urls") {
          const domainId = (params.meta as { domainId?: string } | undefined)?.domainId;
          if (!domainId) throw toHttpError(new Error("Missing meta.domainId for urls resource"), 400);
          const data = await requestJson<{ items: TData[] }>(buildUrl(baseUrl, `/domains/${domainId}/urls`));
          return { data: data.items, total: data.items.length };
        }

        if (params.resource === "crawls") {
          const urlId = (params.meta as { urlId?: string } | undefined)?.urlId;
          if (!urlId) throw toHttpError(new Error("Missing meta.urlId for crawls resource"), 400);
          const data = await requestJson<{ items: TData[] }>(buildUrl(baseUrl, `/urls/${urlId}/crawls`, { limit: 200 }));
          return { data: data.items, total: data.items.length };
        }

        throw toHttpError(new Error(`Unknown resource: ${params.resource}`), 400);
      } catch (e) {
        throw toHttpError(e);
      }
    },

    getOne: async <TData extends BaseRecord = BaseRecord>(params: GetOneParams): Promise<GetOneResponse<TData>> => {
      try {
        if (params.resource === "domains") {
          const data = await requestJson<TData>(
            buildUrl(baseUrl, `/domains/${params.id}`, {
              includeUrls: true,
              includeLatestCrawls: true,
              includeProfile: true,
              includeDerived: true,
              derivedPreferStatus: "SUCCESS",
              latestCrawlStatus: "ANY",
            })
          );
          return { data };
        }

        if (params.resource === "categories") {
          const data = await requestJson<TData>(buildUrl(baseUrl, `/categories/${params.id}`));
          return { data };
        }

        if (params.resource === "technologies") {
          const data = await requestJson<TData>(buildUrl(baseUrl, `/technologies/${params.id}`));
          return { data };
        }

        if (params.resource === "jobs") {
          const data = await requestJson<TData>(buildUrl(baseUrl, `/jobs/${params.id}`));
          return { data };
        }

        if (params.resource === "urls") {
          const domainId = (params.meta as { domainId?: string } | undefined)?.domainId;
          if (!domainId) throw toHttpError(new Error("Missing meta.domainId for urls resource"), 400);
          const data = await requestJson<TData>(buildUrl(baseUrl, `/domains/${domainId}/urls/${params.id}`));
          return { data };
        }

        if (params.resource === "crawls") {
          const urlId = (params.meta as { urlId?: string } | undefined)?.urlId;
          if (!urlId) throw toHttpError(new Error("Missing meta.urlId for crawls resource"), 400);
          const data = await requestJson<TData>(buildUrl(baseUrl, `/urls/${urlId}/crawls/${params.id}`));
          return { data };
        }

        throw toHttpError(new Error(`Unknown resource: ${params.resource}`), 400);
      } catch (e) {
        throw toHttpError(e);
      }
    },

    create: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>(
      params: CreateParams<TVariables>
    ): Promise<CreateResponse<TData>> => {
      try {
        if (params.resource === "domains") {
          const data = await requestJson<TData>(buildUrl(baseUrl, "/domains"), {
            method: "POST",
            body: JSON.stringify(params.variables ?? {}),
          });
          return { data };
        }

        if (params.resource === "categories") {
          const data = await requestJson<TData>(buildUrl(baseUrl, "/categories"), {
            method: "POST",
            body: JSON.stringify(params.variables ?? {}),
          });
          return { data };
        }

        if (params.resource === "technologies") {
          const data = await requestJson<TData>(buildUrl(baseUrl, "/technologies"), {
            method: "POST",
            body: JSON.stringify(params.variables ?? {}),
          });
          return { data };
        }

        if (params.resource === "urls") {
          const domainId = (params.meta as { domainId?: string } | undefined)?.domainId;
          if (!domainId) throw toHttpError(new Error("Missing meta.domainId for urls resource"), 400);
          const data = await requestJson<TData>(buildUrl(baseUrl, `/domains/${domainId}/urls`), {
            method: "POST",
            body: JSON.stringify(params.variables ?? {}),
          });
          return { data };
        }

        if (params.resource === "crawls") {
          const urlId = (params.meta as { urlId?: string } | undefined)?.urlId;
          if (!urlId) throw toHttpError(new Error("Missing meta.urlId for crawls resource"), 400);
          const data = await requestJson<TData>(buildUrl(baseUrl, `/urls/${urlId}/crawls`), {
            method: "POST",
            body: JSON.stringify(params.variables ?? {}),
          });
          return { data };
        }

        throw toHttpError(new Error(`Unknown resource: ${params.resource}`), 400);
      } catch (e) {
        throw toHttpError(e);
      }
    },

    deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = {}>(
      params: DeleteOneParams<TVariables>
    ): Promise<DeleteOneResponse<TData>> => {
      try {
        if (params.resource === "domains") {
          const data = await requestJson<TData>(buildUrl(baseUrl, `/domains/${params.id}`), { method: "DELETE" });
          return { data };
        }

        if (params.resource === "categories") {
          const data = await requestJson<TData>(buildUrl(baseUrl, `/categories/${params.id}`), { method: "DELETE" });
          return { data };
        }

        if (params.resource === "technologies") {
          const data = await requestJson<TData>(buildUrl(baseUrl, `/technologies/${params.id}`), { method: "DELETE" });
          return { data };
        }

        throw toHttpError(new Error(`Delete not supported for resource: ${params.resource}`), 400);
      } catch (e) {
        throw toHttpError(e);
      }
    },

    update: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>(
      params: UpdateParams<TVariables>
    ): Promise<UpdateResponse<TData>> => {
      try {
        if (params.resource === "categories") {
          const data = await requestJson<TData>(buildUrl(baseUrl, `/categories/${params.id}`), {
            method: "PATCH",
            body: JSON.stringify(params.variables ?? {}),
          });
          return { data };
        }

        if (params.resource === "technologies") {
          const data = await requestJson<TData>(buildUrl(baseUrl, `/technologies/${params.id}`), {
            method: "PATCH",
            body: JSON.stringify(params.variables ?? {}),
          });
          return { data };
        }

        throw toHttpError(new Error(`Update not supported for resource: ${params.resource}`), 400);
      } catch (e) {
        throw toHttpError(e);
      }
    },

    custom: async <TData extends BaseRecord = BaseRecord, TQuery = unknown, TPayload = unknown>(
      params: CustomParams<TQuery, TPayload>
    ): Promise<CustomResponse<TData>> => {
      try {
        const method = params.method ?? "get";
        const url = buildUrl(baseUrl, params.url);
        const response = await fetch(url, {
          method: method.toUpperCase(),
          headers: {
            "Content-Type": "application/json",
            ...(params.headers ?? {}),
          },
          body: params.payload ? JSON.stringify(params.payload) : undefined,
        });

        const payload = (await response.json()) as unknown;

        if (isApiEnvelope(payload)) {
          if (!response.ok || isApiError(payload as ApiEnvelope<TData>)) {
            const message = isApiError(payload as ApiEnvelope<TData>) ? (payload as { ok: false; error: { message: string } }).error.message : "Request failed";
            throw { message, statusCode: response.status } satisfies HttpError;
          }
          return { data: (payload as { ok: true; data: TData }).data };
        }

        if (!response.ok) {
          throw { message: "Request failed", statusCode: response.status } satisfies HttpError;
        }

        return { data: payload as TData };
      } catch (e) {
        throw toHttpError(e);
      }
    },

    getApiUrl: () => baseUrl,
  };
}
