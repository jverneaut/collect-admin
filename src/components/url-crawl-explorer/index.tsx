import type { HttpError } from "@refinedev/core";
import { useCreate, useList, useOne } from "@refinedev/core";
import { Button, Card, Empty, Select, Slider, Space, Tag, Typography } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import type { UrlCrawl } from "../../types/collect";
import { CrawlDetailsTabs } from "../crawl-details-tabs";

export type UrlCrawlExplorerProps = {
  urlId: string;
  pollIntervalMs?: number;
};

export const UrlCrawlExplorer: React.FC<UrlCrawlExplorerProps> = ({ urlId, pollIntervalMs }) => {
  const [selectedCrawlId, setSelectedCrawlId] = useState<string | null>(null);

  const { query: crawlsQuery, result: crawlsResult } = useList<UrlCrawl, HttpError>({
    resource: "crawls",
    meta: { urlId },
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(urlId), refetchInterval: pollIntervalMs },
  });

  const crawls = useMemo(() => crawlsResult.data ?? [], [crawlsResult.data]);

  useEffect(() => {
    if (!selectedCrawlId && crawls.length) setSelectedCrawlId(crawls[0].id);
    if (selectedCrawlId && crawls.length && !crawls.some((c) => c.id === selectedCrawlId)) setSelectedCrawlId(crawls[0].id);
  }, [crawls, selectedCrawlId]);

  const selectedIndex = useMemo(() => {
    if (!selectedCrawlId) return 0;
    const idx = crawls.findIndex((c) => c.id === selectedCrawlId);
    return idx < 0 ? 0 : idx;
  }, [crawls, selectedCrawlId]);

  const { query: crawlQuery, result: crawl } = useOne<UrlCrawl, HttpError>({
    resource: "crawls",
    id: selectedCrawlId ?? "",
    meta: { urlId },
    queryOptions: { enabled: Boolean(urlId && selectedCrawlId) },
  });

  const { mutate: createCrawl, mutation: createCrawlMutation } = useCreate<
    UrlCrawl,
    HttpError,
    { tasks: string[] }
  >();

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Card size="small">
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Space wrap>
              <Typography.Text strong>Crawls</Typography.Text>
              <Tag>{crawls.length}</Tag>
              {selectedCrawlId ? (
                <Typography.Text type="secondary">Selected: {selectedCrawlId}</Typography.Text>
              ) : null}
            </Space>
            <Space wrap>
              <Button
                type="primary"
                loading={createCrawlMutation.isPending}
                onClick={() => {
                  createCrawl(
                    { resource: "crawls", meta: { urlId }, values: { tasks: ["SCREENSHOT", "TECHNOLOGIES", "CATEGORIES", "CONTENT", "COLORS"] } },
                    { onSuccess: () => crawlsQuery.refetch() }
                  );
                }}
              >
                Create crawl
              </Button>
              <Button onClick={() => crawlsQuery.refetch()} loading={crawlsQuery.isFetching}>
                Refresh
              </Button>
            </Space>
          </Space>

          {crawls.length ? (
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <Select
                value={selectedCrawlId ?? undefined}
                onChange={(v) => setSelectedCrawlId(v)}
                style={{ width: "100%" }}
                options={crawls.map((c) => ({
                  value: c.id,
                  label: `${new Date(c.createdAt).toLocaleString()} · ${c.status} · ${c.id}`,
                }))}
              />
              {crawls.length > 1 ? (
                <Slider
                  min={0}
                  max={Math.max(0, crawls.length - 1)}
                  value={selectedIndex}
                  onChange={(idx) => {
                    const crawlAtIndex = crawls[idx];
                    if (crawlAtIndex) setSelectedCrawlId(crawlAtIndex.id);
                  }}
                />
              ) : null}
            </Space>
          ) : crawlsQuery.isLoading ? null : (
            <Empty description="No crawls yet" />
          )}
        </Space>
      </Card>

      <Card size="small" loading={crawlQuery.isLoading}>
        <CrawlDetailsTabs
          crawl={crawl ?? null}
          onUpdated={() => {
            crawlQuery.refetch();
            crawlsQuery.refetch();
          }}
        />
      </Card>
    </Space>
  );
};
