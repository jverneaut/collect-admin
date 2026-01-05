import { List } from "@refinedev/antd";
import type { HttpError } from "@refinedev/core";
import { useCustom, useNavigation } from "@refinedev/core";
import { Empty, Input, List as AntdList, Space, Tag, Typography } from "antd";
import React, { useMemo, useState } from "react";
import { WebsiteCard } from "../components";
import type { Category, CrawlRun, Domain, Screenshot, Url, UrlCrawl } from "../types/collect";

type ReviewQueueItem = {
  domain: Domain;
  pendingCrawlRunsCount: number;
  latestPendingCrawlRun: CrawlRun | null;
  latestPendingOverview: {
    homepageUrl: Url | null;
    homepageLatestCrawl: UrlCrawl | null;
    screenshot: Screenshot | null;
    primaryCategory: Category | null;
    categoryConfidence: number | null;
  } | null;
};

type ReviewQueueResponse = {
  items: ReviewQueueItem[];
};

export const ReviewList: React.FC = () => {
  const { show } = useNavigation();
  const [searchValue, setSearchValue] = useState("");

  const { query, result } = useCustom<ReviewQueueResponse, HttpError>({
    url: "/admin/review/domains?limit=100",
    method: "get",
    queryOptions: { refetchInterval: 10_000 },
  });

  const items = useMemo(() => {
    const all = result.data?.items ?? [];
    const search = searchValue.trim().toLowerCase();
    if (!search) return all;
    return all.filter((item) => {
      const host = item.domain.host?.toLowerCase() ?? "";
      const canonicalUrl = item.domain.canonicalUrl?.toLowerCase() ?? "";
      const name = item.domain.profile?.name?.toLowerCase() ?? "";
      return host.includes(search) || canonicalUrl.includes(search) || name.includes(search);
    });
  }, [result.data?.items, searchValue]);

  return (
    <List
      title="Reviews"
      headerButtons={({ defaultButtons }) => (
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Input.Search
            placeholder="Search by host…"
            allowClear
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{ maxWidth: 360 }}
          />
          <Space>{defaultButtons}</Space>
        </Space>
      )}
    >
      {items.length ? (
        <AntdList
          loading={query.isLoading}
          dataSource={items}
          grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 4 }}
          renderItem={(item) => {
            const title = item.domain.profile?.name ?? item.domain.displayName ?? item.domain.host;
            const description = item.domain.profile?.description ?? null;
            const run = item.latestPendingCrawlRun;
            const overview = item.latestPendingOverview;
            const domainIsPublished = Boolean(item.domain.isPublished);

            const screenshotSrc = overview?.screenshot?.publicUrl ?? undefined;
            const categoryName = overview?.primaryCategory?.name ?? null;
            const runStatus = run?.status ?? null;
            const runDate = run?.createdAt ? new Date(run.createdAt).toLocaleDateString() : null;

            return (
              <AntdList.Item key={item.domain.id}>
                <WebsiteCard
                  title={title}
                  url={item.domain.canonicalUrl}
                  description={description}
                  screenshotSrc={screenshotSrc}
                  enableScreenshotViewer
                  tags={[
                    { label: `pending: ${item.pendingCrawlRunsCount}` },
                    { label: domainIsPublished ? "domain: published" : "domain: not published", color: domainIsPublished ? "green" : "default" },
                    runStatus ? { label: `run: ${runStatus}`, color: runStatus === "SUCCESS" ? "green" : "default" } : { label: "run: n/a" },
                    ...(categoryName ? [{ label: categoryName }] : []),
                    ...(runDate ? [{ label: runDate }] : []),
                  ]}
                  onClick={() => show("domains", item.domain.id)}
                  extra={
                    <Space onClick={(e) => e.stopPropagation()}>
                      <Typography.Link onClick={() => show("domains", item.domain.id)}>Open</Typography.Link>
                      {run?.id ? <Tag>{run.id}</Tag> : null}
                    </Space>
                  }
                />
              </AntdList.Item>
            );
          }}
        />
      ) : query.isLoading ? null : (
        <Empty description="Nothing to review" />
      )}
    </List>
  );
};
