import type { BaseRecord, HttpError } from "@refinedev/core";
import { useCustom } from "@refinedev/core";
import { Card, Drawer, Empty, List as AntdList, Slider, Space, Tag, Typography } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import type { CrawlRun, Domain, Url, UrlCrawl } from "../../types/collect";
import { CrawlDetailsTabs } from "../crawl-details-tabs";
import { WebsiteCard } from "../website-card";

type GqlError = { message: string };
type GqlResponse<T> = { data?: T; errors?: GqlError[] };

type DomainTimelineData = {
  domain: (Domain & { urls: Url[]; crawlRuns: CrawlRun[] }) | null;
};

type DomainSnapshotData = {
  domain: (Domain & { urls: Array<Url & { crawlInRun?: UrlCrawl | null }> }) | null;
};

const DOMAIN_TIMELINE_META_QUERY = `
  query DomainTimelineMeta($id: ID!, $urlsLimit: Int = 50, $runsLimit: Int = 80) {
    domain(id: $id) {
      id
      host
      canonicalUrl
      displayName
      profile { name description }
      crawlRuns(limit: $runsLimit) {
        id
        domainId
        status
        jobId
        startedAt
        finishedAt
        error
        createdAt
        updatedAt
      }
      urls(limit: $urlsLimit) {
        id
        domainId
        path
        normalizedUrl
        type
        isCanonical
        createdAt
        updatedAt
      }
    }
  }
`;

const DOMAIN_TIMELINE_SNAPSHOT_QUERY = `
  query DomainTimelineSnapshot($id: ID!, $urlsLimit: Int = 50, $runId: ID!) {
    domain(id: $id) {
      id
      urls(limit: $urlsLimit) {
        id
        domainId
        path
        normalizedUrl
        type
        isCanonical
        createdAt
        updatedAt
        crawlInRun(runId: $runId) {
          id
          urlId
          crawlRunId
          status
          startedAt
          finishedAt
          crawledAt
          httpStatus
          finalUrl
          title
          metaDescription
          language
          contentHash
          error
          createdAt
          updatedAt
          tasks { id crawlId type status attempts lastAttemptAt startedAt finishedAt error createdAt updatedAt }
          screenshots { id crawlId kind width height format storageKey publicUrl createdAt }
          categories { confidence category { id slug name description } }
          technologies { confidence technology { id slug name websiteUrl } }
        }
      }
    }
  }
`;

function parseMs(iso: string) {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

function runTime(run: CrawlRun) {
  return run.finishedAt ?? run.startedAt ?? run.createdAt;
}

export type DomainTimelineExplorerProps = {
  domainId: string;
  urlsLimit?: number;
  runsLimit?: number;
};

export const DomainTimelineExplorer: React.FC<DomainTimelineExplorerProps> = ({
  domainId,
  urlsLimit = 50,
  runsLimit = 80,
}) => {
  const { query, result } = useCustom<
    BaseRecord,
    HttpError,
    unknown,
    { query: string; variables: Record<string, unknown> },
    BaseRecord
  >({
    url: "/graphql",
    method: "post",
    config: { payload: { query: DOMAIN_TIMELINE_META_QUERY, variables: { id: domainId, urlsLimit, runsLimit } } },
    queryOptions: { enabled: Boolean(domainId) },
  });

  const response = result.data as unknown as GqlResponse<DomainTimelineData>;
  const errors = response?.errors ?? [];
  const domain = response?.data?.domain ?? null;

  const urls = useMemo(() => domain?.urls ?? [], [domain?.urls]);
  const crawlRuns = useMemo(() => domain?.crawlRuns ?? [], [domain?.crawlRuns]);

  const runsSorted = useMemo(() => {
    return [...crawlRuns]
      .map((r) => ({ run: r, ms: parseMs(runTime(r)) }))
      .filter((r) => r.ms > 0)
      .sort((a, b) => b.ms - a.ms)
      .map((row) => row.run);
  }, [crawlRuns]);

  const activeRuns = useMemo(
    () => runsSorted.filter((r) => r.status === "PENDING" || r.status === "RUNNING"),
    [runsSorted]
  );

  const timeline = useMemo(() => {
    const finished = crawlRuns.filter((r) => r.status === "SUCCESS" || r.status === "FAILED");
    const sorted = finished
      .map((r) => ({ run: r, ms: parseMs(runTime(r)) }))
      .filter((r) => r.ms > 0)
      .sort((a, b) => a.ms - b.ms);
    return sorted.map((row) => row.run);
  }, [crawlRuns]);

  const [index, setIndex] = useState(0);
  const selectedTimelineRun = timeline[Math.min(index, Math.max(0, timeline.length - 1))] ?? null;

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const selectedRun = useMemo(
    () => runsSorted.find((r) => r.id === selectedRunId) ?? null,
    [runsSorted, selectedRunId]
  );
  const effectiveRun = selectedRun ?? selectedTimelineRun;

  const [isInitialized, setIsInitialized] = useState(false);
  useEffect(() => {
    setIndex(0);
    setIsInitialized(false);
    setSelectedRunId(null);
  }, [domainId]);

  useEffect(() => {
    if (!isInitialized && timeline.length) {
      setIndex(timeline.length - 1);
      setIsInitialized(true);
    }
  }, [isInitialized, timeline.length]);

  const { query: snapshotQuery, result: snapshotResult } = useCustom<
    BaseRecord,
    HttpError,
    unknown,
    { query: string; variables: Record<string, unknown> },
    BaseRecord
  >({
    url: "/graphql",
    method: "post",
    config: {
      payload: {
        query: DOMAIN_TIMELINE_SNAPSHOT_QUERY,
        variables: { id: domainId, urlsLimit, runId: effectiveRun?.id },
      },
    },
    queryOptions: { enabled: Boolean(domainId && effectiveRun?.id) },
  });

  const snapshotResponse = snapshotResult.data as unknown as GqlResponse<DomainSnapshotData>;
  const snapshotDomain = snapshotResponse?.data?.domain ?? null;
  const snapshotUrls = useMemo(() => snapshotDomain?.urls ?? [], [snapshotDomain?.urls]);

  const snapshot = useMemo(() => {
    if (!effectiveRun) return [];
    const crawlByUrlId = new Map<string, UrlCrawl | null>();
    for (const url of snapshotUrls) {
      crawlByUrlId.set(url.id, url.crawlInRun ?? null);
    }
    return urls.map((url) => ({ url, crawl: crawlByUrlId.get(url.id) ?? null }));
  }, [effectiveRun, snapshotUrls, urls]);

  const mainScreenshotSrc = useMemo(() => {
    const homepage = snapshot.find((s) => s.url.type === "HOMEPAGE") ?? snapshot[0] ?? null;
    return homepage?.crawl?.screenshots?.[0]?.publicUrl ?? undefined;
  }, [snapshot]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<Url | null>(null);
  const [selectedCrawl, setSelectedCrawl] = useState<UrlCrawl | null>(null);

  if (query.isLoading) {
    return <Card loading />;
  }

  if (query.isError) {
    return (
      <Card>
        <Typography.Text type="danger">{(query.error as HttpError).message}</Typography.Text>
        <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          Domain timeline uses GraphQL (`/graphql`). Ensure GraphQL is enabled in `collect-api`.
        </Typography.Paragraph>
      </Card>
    );
  }

  if (errors.length) {
    return (
      <Card>
        <Typography.Text type="danger">GraphQL error: {errors.map((e) => e.message).join(" · ")}</Typography.Text>
      </Card>
    );
  }

  if (!domain) {
    return <Empty description="Domain not found" />;
  }

  const displayName = domain.profile?.name ?? domain.displayName ?? domain.host;
  const snapshotErrors = snapshotResponse?.errors ?? [];

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <WebsiteCard
        title={displayName}
        url={domain.canonicalUrl}
        description={domain.profile?.description ?? null}
        screenshotSrc={mainScreenshotSrc}
        enableScreenshotViewer
        tags={[
          { label: `urls: ${urls.length}` },
          { label: `crawl runs: ${timeline.length}` },
          ...(activeRuns.length ? [{ label: `active: ${activeRuns.length}` }] : []),
        ]}
      />

      <Card size="small">
        {timeline.length ? (
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
              <Typography.Text strong>Site timeline</Typography.Text>
              <Typography.Text type="secondary">
                {selectedTimelineRun ? new Date(parseMs(runTime(selectedTimelineRun))).toLocaleString() : "-"}
              </Typography.Text>
            </Space>
            <Slider
              min={0}
              max={Math.max(0, timeline.length - 1)}
              value={Math.min(index, Math.max(0, timeline.length - 1))}
              onChange={(v) => {
                setIndex(v);
                setSelectedRunId(null);
              }}
              tooltip={{
                formatter: (v) =>
                  typeof v === "number" ? new Date(parseMs(runTime(timeline[v]))).toLocaleString() : "",
              }}
            />
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Scrub through completed domain crawl runs. Snapshot uses the crawls created for the selected run.
            </Typography.Paragraph>
            {effectiveRun ? (
              <Space wrap>
                <Tag color={effectiveRun.status === "SUCCESS" ? "green" : effectiveRun.status === "FAILED" ? "red" : effectiveRun.status === "RUNNING" ? "blue" : "default"}>
                  {effectiveRun.status}
                </Tag>
                {effectiveRun.error ? <Typography.Text type="secondary">{effectiveRun.error}</Typography.Text> : null}
                {effectiveRun.jobId ? <Link to={`/jobs/show/${effectiveRun.jobId}`}>Job</Link> : null}
              </Space>
            ) : null}
          </Space>
        ) : (
          <Empty description="No completed crawl runs yet" />
        )}
      </Card>

      <Card size="small">
        {runsSorted.length ? (
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
              <Typography.Text strong>All crawl runs</Typography.Text>
              <Typography.Text type="secondary">
                Click a run to inspect (includes PENDING/RUNNING).
              </Typography.Text>
            </Space>
            <AntdList
              dataSource={runsSorted}
              renderItem={(run) => (
                <AntdList.Item key={run.id}>
                  <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
                    <Space wrap>
                      <Tag
                        color={
                          run.status === "SUCCESS"
                            ? "green"
                            : run.status === "FAILED"
                              ? "red"
                              : run.status === "RUNNING"
                                ? "blue"
                                : "default"
                        }
                        style={{ cursor: "pointer", userSelect: "none" }}
                        onClick={() => setSelectedRunId(run.id)}
                      >
                        {run.status}
                      </Tag>
                      <Typography.Text>{new Date(parseMs(runTime(run))).toLocaleString()}</Typography.Text>
                      <Typography.Text type="secondary">{run.id}</Typography.Text>
                      {run.error ? <Typography.Text type="secondary">· {run.error}</Typography.Text> : null}
                    </Space>
                    <Space wrap onClick={(e) => e.stopPropagation()}>
                      {run.jobId ? <Link to={`/jobs/show/${run.jobId}`}>Job</Link> : null}
                      {selectedRunId === run.id ? (
                        <Typography.Link onClick={() => setSelectedRunId(null)}>Follow timeline</Typography.Link>
                      ) : null}
                    </Space>
                  </Space>
                </AntdList.Item>
              )}
            />
          </Space>
        ) : (
          <Empty description="No crawl runs yet" />
        )}
      </Card>

      {snapshotQuery.isError ? (
        <Card>
          <Typography.Text type="danger">{(snapshotQuery.error as HttpError).message}</Typography.Text>
        </Card>
      ) : null}

      {snapshotErrors.length ? (
        <Card>
          <Typography.Text type="danger">
            GraphQL error: {snapshotErrors.map((e) => e.message).join(" · ")}
          </Typography.Text>
        </Card>
      ) : null}

      {timeline.length ? (
        <AntdList
          grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 4 }}
          dataSource={snapshot}
          renderItem={({ url, crawl }) => {
            const screenshot = crawl?.screenshots?.[0]?.publicUrl ?? "/placeholder-site.svg";
            const cats = crawl?.categories?.map((c) => c.category?.name).filter(Boolean) ?? [];
            const tech = crawl?.technologies?.map((t) => t.technology?.name).filter(Boolean) ?? [];

            return (
              <AntdList.Item key={url.id}>
                <WebsiteCard
                  title={`${url.type} · ${url.path}`}
                  url={url.normalizedUrl}
                  screenshotSrc={screenshot}
                  enableScreenshotViewer
                  tags={[
                    crawl?.status
                      ? { label: `crawl: ${crawl.status}`, color: crawl.status === "SUCCESS" ? "green" : crawl.status === "FAILED" ? "red" : "default" }
                      : { label: "not crawled in this run" },
                    ...(cats.length ? [{ label: `cat: ${cats.slice(0, 2).join(" · ")}` }] : []),
                    ...(tech.length ? [{ label: `tech: ${tech.slice(0, 2).join(" · ")}` }] : []),
                  ]}
                  extra={
                    <Space onClick={(e) => e.stopPropagation()}>
                      <Link to={`/domains/${domain.id}/urls/show/${url.id}`}>Open</Link>
                      {crawl ? (
                        <Typography.Link
                          onClick={() => {
                            setSelectedUrl(url);
                            setSelectedCrawl(crawl);
                            setDrawerOpen(true);
                          }}
                        >
                          Inspect crawl
                        </Typography.Link>
                      ) : null}
                      <Tag>
                        {crawl ? new Date(parseMs(crawl.crawledAt ?? crawl.finishedAt ?? crawl.createdAt)).toLocaleDateString() : "-"}
                      </Tag>
                    </Space>
                  }
                />
              </AntdList.Item>
            );
          }}
        />
      ) : null}

      <Drawer
        title={selectedUrl ? `${selectedUrl.type} · ${selectedUrl.normalizedUrl}` : "Crawl"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={720}
      >
        <CrawlDetailsTabs crawl={selectedCrawl} />
      </Drawer>
    </Space>
  );
};
