import type { BaseRecord, HttpError } from "@refinedev/core";
import { useCustom } from "@refinedev/core";
import { Card, Drawer, Empty, List as AntdList, Slider, Space, Tag, Typography } from "antd";
import React, { useMemo, useState } from "react";
import { Link } from "react-router";
import type { Domain, Url, UrlCrawl } from "../../types/collect";
import { CrawlDetailsTabs } from "../crawl-details-tabs";
import { WebsiteCard } from "../website-card";

type GqlError = { message: string };
type GqlResponse<T> = { data?: T; errors?: GqlError[] };

type DomainTimelineData = {
  domain: (Domain & { urls: Array<Url & { crawls: UrlCrawl[] }> }) | null;
};

const DOMAIN_TIMELINE_QUERY = `
  query DomainTimeline($id: ID!, $urlsLimit: Int = 50, $crawlsLimit: Int = 30) {
    domain(id: $id) {
      id
      host
      canonicalUrl
      displayName
      profile { name description }
      urls(limit: $urlsLimit) {
        id
        domainId
        path
        normalizedUrl
        type
        isCanonical
        createdAt
        updatedAt
        crawls(limit: $crawlsLimit) {
          id
          urlId
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

function crawlTime(crawl: UrlCrawl) {
  return crawl.crawledAt ?? crawl.finishedAt ?? crawl.createdAt;
}

function parseMs(iso: string) {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

export type DomainTimelineExplorerProps = {
  domainId: string;
  urlsLimit?: number;
  crawlsLimit?: number;
};

export const DomainTimelineExplorer: React.FC<DomainTimelineExplorerProps> = ({
  domainId,
  urlsLimit = 50,
  crawlsLimit = 30,
}) => {
  const { query, result } = useCustom<BaseRecord, HttpError, unknown, { query: string; variables: Record<string, unknown> }, BaseRecord>({
    url: "/graphql",
    method: "post",
    config: { payload: { query: DOMAIN_TIMELINE_QUERY, variables: { id: domainId, urlsLimit, crawlsLimit } } },
    queryOptions: { enabled: Boolean(domainId) },
  });

  const response = result.data as unknown as GqlResponse<DomainTimelineData>;
  const errors = response?.errors ?? [];
  const domain = response?.data?.domain ?? null;

  const urls = useMemo(() => domain?.urls ?? [], [domain?.urls]);

  const timeline = useMemo(() => {
    const points = new Map<number, string>();
    for (const url of urls) {
      for (const crawl of url.crawls ?? []) {
        const t = crawlTime(crawl);
        if (!t) continue;
        const ms = parseMs(t);
        if (!ms) continue;
        points.set(ms, t);
      }
    }
    const sorted = [...points.entries()].sort((a, b) => a[0] - b[0]);
    return sorted.map(([ms, iso]) => ({ ms, iso }));
  }, [urls]);

  const [index, setIndex] = useState(0);
  const selected = timeline[Math.min(index, Math.max(0, timeline.length - 1))] ?? null;

  const snapshot = useMemo(() => {
    if (!selected) return [];
    return urls.map((url) => {
      const crawls = (url.crawls ?? [])
        .map((c) => ({ crawl: c, ms: parseMs(crawlTime(c) ?? c.createdAt) }))
        .filter((c) => c.ms > 0)
        .sort((a, b) => a.ms - b.ms);

      const atOrBefore = [...crawls].reverse().find((c) => c.ms <= selected.ms) ?? null;
      return { url, crawl: atOrBefore?.crawl ?? null };
    });
  }, [selected, urls]);

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

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <WebsiteCard
        title={displayName}
        url={domain.canonicalUrl}
        description={domain.profile?.description ?? null}
        tags={[
          { label: `urls: ${urls.length}` },
          { label: `timeline points: ${timeline.length}` },
        ]}
      />

      <Card size="small">
        {timeline.length ? (
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
              <Typography.Text strong>Site timeline</Typography.Text>
              <Typography.Text type="secondary">
                {selected ? new Date(selected.ms).toLocaleString() : "-"}
              </Typography.Text>
            </Space>
            <Slider
              min={0}
              max={Math.max(0, timeline.length - 1)}
              value={Math.min(index, Math.max(0, timeline.length - 1))}
              onChange={(v) => setIndex(v)}
              tooltip={{ formatter: (v) => (typeof v === "number" ? new Date(timeline[v]?.ms ?? 0).toLocaleString() : "") }}
            />
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Snapshot is computed by selecting, for each URL, the latest crawl at or before the chosen time.
            </Typography.Paragraph>
          </Space>
        ) : (
          <Empty description="No crawl history available yet" />
        )}
      </Card>

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
                  tags={[
                    crawl?.status
                      ? { label: `crawl: ${crawl.status}`, color: crawl.status === "SUCCESS" ? "green" : crawl.status === "FAILED" ? "red" : "default" }
                      : { label: "not crawled yet" },
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
                      <Tag>{crawl ? new Date(parseMs(crawlTime(crawl) ?? crawl.createdAt)).toLocaleDateString() : "-"}</Tag>
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

