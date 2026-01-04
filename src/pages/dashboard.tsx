import type { BaseRecord, HttpError } from "@refinedev/core";
import { useCustom, useList } from "@refinedev/core";
import { List } from "@refinedev/antd";
import { Card, Space, Table, Tag, Typography } from "antd";
import React, { useMemo } from "react";
import { Link } from "react-router";
import type { Job } from "../types/collect";

type GqlError = { message: string };
type GqlResponse<T> = { data?: T; errors?: GqlError[] };

type DashboardCrawl = {
  id: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | string;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
};

type DashboardUrl = {
  id: string;
  normalizedUrl: string;
  type: string;
  running?: DashboardCrawl | null;
  pending?: DashboardCrawl | null;
};

type DashboardDomain = {
  id: string;
  host: string;
  canonicalUrl: string;
  urls: DashboardUrl[];
};

type DashboardQueryData = {
  domains: { items: DashboardDomain[] };
};

const DASHBOARD_QUERY = `
  query Dashboard($limit: Int = 50) {
    domains(limit: $limit) {
      items {
        id
        host
        canonicalUrl
        urls(limit: 50) {
          id
          normalizedUrl
          type
          running: latestCrawl(status: RUNNING) {
            id
            status
            createdAt
            startedAt
            finishedAt
          }
          pending: latestCrawl(status: PENDING) {
            id
            status
            createdAt
            startedAt
            finishedAt
          }
        }
      }
    }
  }
`;

export const Dashboard: React.FC = () => {
  const { query, result } = useCustom<BaseRecord, HttpError, unknown, { query: string; variables: Record<string, unknown> }, BaseRecord>({
    url: "/graphql",
    method: "post",
    config: { payload: { query: DASHBOARD_QUERY, variables: { limit: 50 } } },
    queryOptions: { refetchInterval: 5000 },
  });

  const { query: jobsQuery, result: jobsResult } = useList<Job, HttpError>({
    resource: "jobs",
    pagination: { mode: "off" },
    queryOptions: { refetchInterval: 2000 },
  });

  const response = result.data as unknown as GqlResponse<DashboardQueryData>;

  const errors = response?.errors ?? [];
  const domains = response?.data?.domains?.items ?? [];

  const active = useMemo(() => {
    const rows: Array<{
      key: string;
      domainId: string;
      domainHost: string;
      domainCanonicalUrl: string;
      urlId: string;
      normalizedUrl: string;
      type: string;
      crawl: DashboardCrawl;
    }> = [];

    for (const domain of domains) {
      for (const url of domain.urls ?? []) {
        const crawl = url.running ?? url.pending ?? null;
        if (!crawl) continue;
        rows.push({
          key: `${domain.id}:${url.id}:${crawl.id}`,
          domainId: domain.id,
          domainHost: domain.host,
          domainCanonicalUrl: domain.canonicalUrl,
          urlId: url.id,
          normalizedUrl: url.normalizedUrl,
          type: url.type,
          crawl,
        });
      }
    }

    rows.sort((a, b) => (a.crawl.createdAt < b.crawl.createdAt ? 1 : -1));
    return rows;
  }, [domains]);

  const jobs = useMemo(() => jobsResult.data ?? [], [jobsResult.data]);
  const activeJobs = useMemo(
    () => jobs.filter((j) => j.status === "QUEUED" || j.status === "RUNNING"),
    [jobs]
  );

  return (
    <List title="Dashboard">
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card size="small">
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Space wrap>
              <Typography.Text strong>Jobs</Typography.Text>
              <Tag color={activeJobs.length ? "blue" : "default"}>{activeJobs.length} active</Tag>
              <Typography.Text type="secondary">Auto-refresh: 2s</Typography.Text>
            </Space>
            <Link to="/jobs">Open jobs</Link>
          </Space>
          {jobsQuery.isError ? (
            <Typography.Paragraph type="danger" style={{ marginTop: 12, marginBottom: 0 }}>
              Jobs error: {(jobsQuery.error as HttpError).message}
            </Typography.Paragraph>
          ) : null}
        </Card>

        <Card size="small">
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Space wrap>
              <Typography.Text strong>Active crawls</Typography.Text>
              <Tag color={active.length ? "blue" : "default"}>{active.length}</Tag>
              <Typography.Text type="secondary">Auto-refresh: 5s</Typography.Text>
            </Space>
            <Typography.Link onClick={() => query.refetch()} disabled={query.isFetching}>
              Refresh now
            </Typography.Link>
          </Space>
          {errors.length ? (
            <Typography.Paragraph type="danger" style={{ marginTop: 12, marginBottom: 0 }}>
              GraphQL error: {errors.map((e) => e.message).join(" · ")}
            </Typography.Paragraph>
          ) : null}
          {query.isError ? (
            <Typography.Paragraph type="danger" style={{ marginTop: 12, marginBottom: 0 }}>
              Request error: {(query.error as HttpError).message}
            </Typography.Paragraph>
          ) : null}
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
            Shows latest `RUNNING` or `PENDING` crawl per URL (requires GraphQL enabled in `collect-api`).
          </Typography.Paragraph>
        </Card>

        <Table
          rowKey="key"
          loading={query.isLoading}
          dataSource={active}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: "Status", key: "status", render: (_, r) => <Tag>{r.crawl.status}</Tag> },
            { title: "Started", key: "startedAt", render: (_, r) => (r.crawl.startedAt ? new Date(r.crawl.startedAt).toLocaleString() : "-") },
            { title: "Created", key: "createdAt", render: (_, r) => new Date(r.crawl.createdAt).toLocaleString() },
            { title: "Domain", key: "domainHost", render: (_, r) => <Link to={`/domains/show/${r.domainId}`}>{r.domainHost}</Link> },
            {
              title: "URL",
              key: "normalizedUrl",
              render: (_, r) => <Link to={`/domains/${r.domainId}/urls/show/${r.urlId}`}>{r.normalizedUrl}</Link>,
            },
            { title: "Type", dataIndex: "type", key: "type" },
          ]}
        />
      </Space>
    </List>
  );
};
