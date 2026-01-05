import type { BaseRecord, HttpError } from "@refinedev/core";
import { useCustom, useCustomMutation } from "@refinedev/core";
import { Badge, Button, Card, Collapse, Drawer, Empty, List as AntdList, Modal, Slider, Space, Switch, Tag, Tooltip, Typography, Alert, Divider } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import type { CrawlRun, Domain, Url, UrlCrawl } from "../../types/collect";
import { CrawlDetailsTabs } from "../crawl-details-tabs";
import { WebsiteCard } from "../website-card";
import { getDisplayImageSrc } from "../../lib/media";

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
      isPublished
      profile { name description }
      crawlRuns(limit: $runsLimit) {
        id
        domainId
        status
        reviewStatus
        reviewedAt
        isPublished
        publishedAt
        tags
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
          isPublished
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
          screenshots { id crawlId kind isPublished width height format storageKey publicUrl createdAt }
          sections { id crawlId index isPublished format storageKey publicUrl createdAt clip element }
          categories { confidence category { id slug name description } }
          technologies { confidence technology { id slug name websiteUrl iconPublicUrl iconContentType } }
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

const DomainTimelineExplorerLegacy: React.FC<DomainTimelineExplorerProps> = ({
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

  const homepageSnapshot = useMemo(() => {
    return snapshot.find((s) => s.url.type === "HOMEPAGE") ?? snapshot[0] ?? null;
  }, [snapshot]);

  const homepageSections = useMemo(() => homepageSnapshot?.crawl?.sections ?? [], [homepageSnapshot?.crawl?.sections]);

  const mainScreenshotSrc = useMemo(() => {
    return homepageSnapshot?.crawl?.screenshots?.[0]?.publicUrl ?? undefined;
  }, [snapshot]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<Url | null>(null);
  const [selectedCrawl, setSelectedCrawl] = useState<UrlCrawl | null>(null);

  const [sectionViewerOpen, setSectionViewerOpen] = useState(false);
  const [sectionViewerSrc, setSectionViewerSrc] = useState<string | null>(null);
  const [sectionViewerTitle, setSectionViewerTitle] = useState<string>("Section");

  const [baselineDomainIsPublished, setBaselineDomainIsPublished] = useState(false);
  const [baselineRunIsPublished, setBaselineRunIsPublished] = useState(false);
  const [baselineRunTags, setBaselineRunTags] = useState<string[]>([]);
  const [baselinePublishedCrawlIds, setBaselinePublishedCrawlIds] = useState<Set<string>>(new Set());
  const [baselinePublishedSectionIds, setBaselinePublishedSectionIds] = useState<Set<string>>(new Set());

  const [draftDomainIsPublished, setDraftDomainIsPublished] = useState(false);
  const [draftRunIsPublished, setDraftRunIsPublished] = useState(false);
  const [draftRunTags, setDraftRunTags] = useState<string[]>([]);
  const [draftPublishedCrawlIds, setDraftPublishedCrawlIds] = useState<Set<string>>(new Set());
  const [draftPublishedSectionIds, setDraftPublishedSectionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const domainIsPublished = Boolean(domain?.isPublished);
    setBaselineDomainIsPublished(domainIsPublished);
    setDraftDomainIsPublished(domainIsPublished);
  }, [domain?.id, domain?.isPublished]);

  useEffect(() => {
    if (!effectiveRun?.id) return;

    const runIsPublished = Boolean(effectiveRun.isPublished);
    const runTags = Array.isArray(effectiveRun.tags) ? effectiveRun.tags : [];

    const publishedCrawlIds = new Set(
      snapshot
        .map((s) => s.crawl)
        .filter(Boolean)
        .filter((c) => c?.isPublished)
        .map((c) => c?.id)
        .filter(Boolean) as string[],
    );

    const publishedSectionIds = new Set(
      homepageSections
        .filter((s) => s?.isPublished)
        .map((s) => s.id)
        .filter(Boolean),
    );

    setBaselineRunIsPublished(runIsPublished);
    setBaselineRunTags(runTags);
    setBaselinePublishedCrawlIds(publishedCrawlIds);
    setBaselinePublishedSectionIds(publishedSectionIds);

    setDraftRunIsPublished(runIsPublished);
    setDraftRunTags(runTags);
    setDraftPublishedCrawlIds(publishedCrawlIds);
    setDraftPublishedSectionIds(publishedSectionIds);
  }, [effectiveRun?.id, effectiveRun?.isPublished, effectiveRun?.tags, snapshot, homepageSections]);

  const hasRedesignTag = useMemo(() => draftRunTags.includes("redesign"), [draftRunTags]);

  const changes = useMemo(() => {
    const crawlsToPublish = [...draftPublishedCrawlIds].filter((id) => !baselinePublishedCrawlIds.has(id));
    const crawlsToUnpublish = [...baselinePublishedCrawlIds].filter((id) => !draftPublishedCrawlIds.has(id));
    const sectionsToPublish = [...draftPublishedSectionIds].filter((id) => !baselinePublishedSectionIds.has(id));
    const sectionsToUnpublish = [...baselinePublishedSectionIds].filter((id) => !draftPublishedSectionIds.has(id));

    const tagsChanged = (() => {
      const a = [...new Set(baselineRunTags)].sort().join("|");
      const b = [...new Set(draftRunTags)].sort().join("|");
      return a !== b;
    })();

    return {
      domainIsPublishedChanged: draftDomainIsPublished !== baselineDomainIsPublished,
      runIsPublishedChanged: draftRunIsPublished !== baselineRunIsPublished,
      runTagsChanged: tagsChanged,
      crawlsToPublish,
      crawlsToUnpublish,
      sectionsToPublish,
      sectionsToUnpublish,
    };
  }, [
    baselineDomainIsPublished,
    baselinePublishedCrawlIds,
    baselinePublishedSectionIds,
    baselineRunIsPublished,
    baselineRunTags,
    draftDomainIsPublished,
    draftPublishedCrawlIds,
    draftPublishedSectionIds,
    draftRunIsPublished,
    draftRunTags,
  ]);

  const hasChanges =
    changes.domainIsPublishedChanged ||
    changes.runIsPublishedChanged ||
    changes.runTagsChanged ||
    changes.crawlsToPublish.length ||
    changes.crawlsToUnpublish.length ||
    changes.sectionsToPublish.length ||
    changes.sectionsToUnpublish.length;

  const { mutate: savePublication, mutation: savePublicationMutation } = useCustomMutation<
    BaseRecord,
    HttpError,
    {
      domainIsPublished?: boolean;
      crawlRunIsPublished?: boolean;
      crawlRunTags?: string[];
      markReviewed?: boolean;
      crawlsToPublish?: string[];
      crawlsToUnpublish?: string[];
      sectionsToPublish?: string[];
      sectionsToUnpublish?: string[];
    }
  >();

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
  const canPublishSelection = effectiveRun?.status === "SUCCESS";
  const selectableCrawls = snapshot
    .map((s) => ({ url: s.url, crawl: s.crawl }))
    .filter((s): s is { url: Url; crawl: UrlCrawl } => Boolean(s.crawl?.id))
    .filter((s) => s.crawl.status === "SUCCESS");

  const selectableCrawlIds = selectableCrawls.map((s) => s.crawl.id).filter(Boolean);

  const homepageCrawlId = homepageSnapshot?.crawl?.id ?? null;
  const homepageIsEnabled = Boolean(homepageCrawlId && draftPublishedCrawlIds.has(homepageCrawlId));
  const canPickSections = Boolean(
    homepageSnapshot?.crawl?.id &&
      homepageSnapshot.crawl.status === "SUCCESS" &&
      canPublishSelection &&
      homepageIsEnabled,
  );

  const resetDraftToBaseline = () => {
    setDraftDomainIsPublished(baselineDomainIsPublished);
    setDraftRunIsPublished(baselineRunIsPublished);
    setDraftRunTags(baselineRunTags);
    setDraftPublishedCrawlIds(new Set(baselinePublishedCrawlIds));
    setDraftPublishedSectionIds(new Set(baselinePublishedSectionIds));
  };

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
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Space wrap>
              <Typography.Text strong>Review & publish</Typography.Text>
              {effectiveRun?.reviewStatus === "PENDING_REVIEW" ? <Tag color="gold">Needs review</Tag> : null}
              {effectiveRun?.isPublished ? <Tag color="green">Run published</Tag> : <Tag>Run not published</Tag>}
              {hasChanges ? <Tag color="orange">Unsaved changes</Tag> : null}
            </Space>
            <Space wrap>
              <Button disabled={!hasChanges} onClick={resetDraftToBaseline}>
                Reset
              </Button>
              <Button
                type="primary"
                disabled={!effectiveRun?.id || !hasChanges || !canPublishSelection}
                loading={savePublicationMutation.isPending}
                onClick={() => {
                  if (!effectiveRun?.id) return;
                  if (!canPublishSelection) return;
                  savePublication(
                    {
                      url: `/admin/crawl-runs/${effectiveRun.id}/publication`,
                      method: "patch",
                      values: {
                        ...(changes.domainIsPublishedChanged ? { domainIsPublished: draftDomainIsPublished } : {}),
                        ...(changes.runIsPublishedChanged ? { crawlRunIsPublished: draftRunIsPublished } : {}),
                        ...(changes.runTagsChanged ? { crawlRunTags: draftRunTags } : {}),
                        markReviewed: true,
                        crawlsToPublish: changes.crawlsToPublish,
                        crawlsToUnpublish: changes.crawlsToUnpublish,
                        sectionsToPublish: changes.sectionsToPublish,
                        sectionsToUnpublish: changes.sectionsToUnpublish,
                      },
                      successNotification: () => ({ message: "Saved", type: "success" }),
                      errorNotification: (e) => ({ message: e?.message ?? "Failed to save", type: "error" }),
                    },
                    {
                      onSuccess: () => {
                        query.refetch();
                        snapshotQuery.refetch();
                      },
                    },
                  );
                }}
              >
                Save
              </Button>
            </Space>
          </Space>

          <Alert
            type="info"
            showIcon
            message={
              <Space wrap>
                <Typography.Text>
                  Pick what’s visible on the public API for this crawl run.
                </Typography.Text>
                <Typography.Text type="secondary">
                  Select URLs below, optionally select homepage sections, then Save.
                </Typography.Text>
              </Space>
            }
          />

          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Space wrap>
              <Typography.Text type="secondary">Domain published</Typography.Text>
              <Switch checked={draftDomainIsPublished} onChange={(v) => setDraftDomainIsPublished(v)} />
            </Space>
            <Space wrap>
              <Typography.Text type="secondary">Publish this crawl run</Typography.Text>
              <Switch
                checked={draftRunIsPublished}
                disabled={!effectiveRun?.id || !canPublishSelection}
                onChange={(v) => setDraftRunIsPublished(v)}
              />
            </Space>
            <Space wrap>
              <Typography.Text type="secondary">Redesign</Typography.Text>
              <Switch
                checked={hasRedesignTag}
                disabled={!effectiveRun?.id || !canPublishSelection}
                onChange={(v) =>
                  setDraftRunTags((prev) => {
                    const next = new Set(prev);
                    if (v) next.add("redesign");
                    else next.delete("redesign");
                    return [...next];
                  })
                }
              />
            </Space>
          </Space>

          <Divider style={{ margin: "6px 0" }} />

          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Space wrap>
              <Typography.Text type="secondary">Public URLs</Typography.Text>
              <Tag color={draftPublishedCrawlIds.size ? "green" : "default"}>
                {draftPublishedCrawlIds.size}/{selectableCrawlIds.length}
              </Tag>
              <Button
                size="small"
                disabled={!canPublishSelection || selectableCrawlIds.length === 0}
                onClick={() => setDraftPublishedCrawlIds(new Set(selectableCrawlIds))}
              >
                Select all
              </Button>
              <Button
                size="small"
                disabled={!draftPublishedCrawlIds.size}
                onClick={() => {
                  setDraftPublishedCrawlIds(new Set());
                  setDraftPublishedSectionIds(new Set());
                }}
              >
                Clear
              </Button>
            </Space>

            <Space wrap>
              <Typography.Text type="secondary">Public homepage sections</Typography.Text>
              <Tag color={draftPublishedSectionIds.size ? "green" : "default"}>
                {draftPublishedSectionIds.size}/{homepageSections.length}
              </Tag>
              <Tooltip title={canPickSections ? null : "Enable the homepage URL (and Save) to pick sections"}>
                <Button
                  size="small"
                  disabled={!canPickSections || homepageSections.length === 0}
                  onClick={() => setDraftPublishedSectionIds(new Set(homepageSections.map((s) => s.id)))}
                >
                  Select all
                </Button>
              </Tooltip>
              <Button
                size="small"
                disabled={!draftPublishedSectionIds.size}
                onClick={() => setDraftPublishedSectionIds(new Set())}
              >
                Clear
              </Button>
            </Space>
          </Space>
        </Space>
      </Card>

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
            const tech =
              crawl?.technologies
                ?.map((t) => t.technology)
                .filter((t): t is NonNullable<typeof t> => Boolean(t)) ?? [];
            const canToggle = Boolean(crawl?.id && crawl.status === "SUCCESS" && canPublishSelection);
            const isEnabled = Boolean(crawl?.id && draftPublishedCrawlIds.has(crawl.id));
            const isPendingReview = effectiveRun?.reviewStatus === "PENDING_REVIEW";
            const ribbonText = !crawl?.id
              ? "Not crawled"
              : !canPublishSelection
                ? "Pick a SUCCESS run"
                : crawl.status !== "SUCCESS"
                  ? "Not ready"
                  : isEnabled
                    ? "Public"
                    : "Hidden";
            const ribbonColor = !crawl?.id
              ? "default"
              : !canPublishSelection || crawl.status !== "SUCCESS"
                ? "gold"
                : isEnabled
                  ? "green"
                  : "default";
            const opacity = !crawl?.id ? 0.25 : canToggle ? (isEnabled ? 1 : 0.6) : 0.35;

            return (
              <AntdList.Item key={url.id}>
                <div style={{ opacity, transition: "opacity 120ms ease" }}>
                  <Badge.Ribbon text={ribbonText} color={ribbonColor}>
                    <WebsiteCard
                      title={`${url.type} · ${url.path}`}
                      url={url.normalizedUrl}
                      screenshotSrc={screenshot}
                      enableScreenshotViewer
                      onClick={
                        canToggle
                          ? () => {
                              setDraftPublishedCrawlIds((prev) => {
                                const next = new Set(prev);
                                if (crawl?.id && next.has(crawl.id)) {
                                  next.delete(crawl.id);
                                  if (url.type === "HOMEPAGE") {
                                    setDraftPublishedSectionIds(new Set());
                                  }
                                } else if (crawl?.id) {
                                  next.add(crawl.id);
                                }
                                return next;
                              });
                            }
                          : undefined
                      }
                      tags={[
                        crawl?.status
                          ? {
                              label: `crawl: ${crawl.status}`,
                              color:
                                crawl.status === "SUCCESS"
                                  ? "green"
                                  : crawl.status === "FAILED"
                                    ? "red"
                                    : crawl.status === "RUNNING"
                                      ? "blue"
                                      : "default",
                            }
                          : { label: "not crawled in this run" },
                        ...(crawl?.id ? [{ label: isEnabled ? "public" : "private", color: isEnabled ? "green" : "default" }] : []),
                        ...(isPendingReview ? [{ label: "click to toggle" }] : []),
                        ...(cats.length ? [{ label: `cat: ${cats.slice(0, 2).join(" · ")}` }] : []),
                        ...tech.slice(0, 2).map((t) => ({
                          key: `tech:${t.id ?? t.slug ?? t.name}`,
                          label: (
                            <Space size={6}>
                              {t.iconPublicUrl ? (
                                <img
                                  src={getDisplayImageSrc(t.iconPublicUrl, { placeholder: "/placeholder-site.svg" })}
                                  alt=""
                                  width={14}
                                  height={14}
                                  style={{ display: "block" }}
                                />
                              ) : null}
                              {t.name}
                            </Space>
                          ),
                        })),
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
                            {crawl
                              ? new Date(parseMs(crawl.crawledAt ?? crawl.finishedAt ?? crawl.createdAt)).toLocaleDateString()
                              : "-"}
                          </Tag>
                        </Space>
                      }
                    />
                  </Badge.Ribbon>
                </div>
              </AntdList.Item>
            );
          }}
        />
      ) : null}

      {homepageSections.length ? (
        <Card size="small" title={`Homepage sections (${homepageSections.length})`}>
          {!canPickSections ? (
            <Alert
              style={{ marginBottom: 12 }}
              type="warning"
              showIcon
              message="Enable the homepage URL (Public URLs) to pick sections."
            />
          ) : null}
          <Space size={12} wrap>
            {homepageSections.map((section) => {
              const isEnabled = draftPublishedSectionIds.has(section.id);
              const canToggle = canPickSections;
              return (
                <div
                  key={section.id}
                  style={{
                    width: 220,
                    cursor: canToggle ? "pointer" : "not-allowed",
                    opacity: isEnabled ? 1 : 0.6,
                    transition: "opacity 120ms ease",
                  }}
                  onClick={() => {
                    if (!canToggle) return;
                    setDraftPublishedSectionIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(section.id)) next.delete(section.id);
                      else next.add(section.id);
                      return next;
                    });
                  }}
                >
                  <Card
                    size="small"
                    styles={{ body: { padding: 8 } }}
                    cover={
                      <img
                        src={getDisplayImageSrc(section.publicUrl ?? undefined)}
                        alt={`Section ${section.index}`}
                        style={{ width: "100%", height: 140, objectFit: "cover", objectPosition: "top" }}
                      />
                    }
                  >
                    <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
                      <Typography.Text>Section {section.index}</Typography.Text>
                      <Space wrap>
                        <Tag color={isEnabled ? "green" : "default"}>{isEnabled ? "public" : "private"}</Tag>
                        <Button
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSectionViewerTitle(`Section ${section.index}`);
                            setSectionViewerSrc(getDisplayImageSrc(section.publicUrl ?? undefined));
                            setSectionViewerOpen(true);
                          }}
                        >
                          View
                        </Button>
                      </Space>
                    </Space>
                  </Card>
                </div>
              );
            })}
          </Space>
        </Card>
      ) : null}

      <Modal
        title={sectionViewerTitle}
        open={sectionViewerOpen}
        onCancel={() => setSectionViewerOpen(false)}
        footer={null}
        centered
        width={1240}
        styles={{ body: { padding: 0 } }}
      >
        <div
          style={{
            maxHeight: "calc(100vh - 220px)",
            overflowY: "auto",
            overflowX: "auto",
            padding: 16,
            textAlign: "center",
            background: "#0b1020",
          }}
        >
          <img
            src={sectionViewerSrc ?? "/placeholder-site.svg"}
            alt={sectionViewerTitle}
            style={{
              width: "min(100%, 1180px)",
              height: "auto",
              display: "block",
              margin: "0 auto",
              background: "#fff",
              borderRadius: 8,
            }}
          />
        </div>
      </Modal>

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

type SnapshotEntry = { url: Url; crawl: UrlCrawl | null };

function toArrayKeys(value: string | string[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function compareMs(a: string | null | undefined, b: string | null | undefined) {
  return parseMs(b ?? "") - parseMs(a ?? "");
}

const CrawlRunAccordionPanel: React.FC<{
  domainId: string;
  urls: Url[];
  urlsLimit: number;
  run: CrawlRun;
  isOpen: boolean;
  onUpdated: () => void;
  onInspectCrawl: (url: Url, crawl: UrlCrawl) => void;
  onDraftWantsDomainPublished: () => void;
}> = ({
  domainId,
  urls,
  urlsLimit,
  run,
  isOpen,
  onUpdated,
  onInspectCrawl,
  onDraftWantsDomainPublished,
}) => {
  const canPublishSelection = run.status === "SUCCESS";

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
        variables: { id: domainId, urlsLimit, runId: run.id },
      },
    },
    queryOptions: { enabled: Boolean(isOpen && domainId && run.id) },
  });

  const snapshotResponse = snapshotResult.data as unknown as GqlResponse<DomainSnapshotData>;
  const snapshotErrors = snapshotResponse?.errors ?? [];
  const snapshotDomain = snapshotResponse?.data?.domain ?? null;

  const snapshotUrls = useMemo(() => snapshotDomain?.urls ?? [], [snapshotDomain?.urls]);

  const snapshot: SnapshotEntry[] = useMemo(() => {
    const crawlByUrlId = new Map<string, UrlCrawl | null>();
    for (const url of snapshotUrls) {
      crawlByUrlId.set(url.id, url.crawlInRun ?? null);
    }
    return urls.map((url) => ({ url, crawl: crawlByUrlId.get(url.id) ?? null }));
  }, [snapshotUrls, urls]);

  const homepageSnapshot = useMemo(() => {
    return snapshot.find((s) => s.url.type === "HOMEPAGE") ?? snapshot[0] ?? null;
  }, [snapshot]);

  const homepageSections = useMemo(
    () => homepageSnapshot?.crawl?.sections ?? [],
    [homepageSnapshot?.crawl?.sections],
  );

  const selectableCrawlIds = useMemo(() => {
    return snapshot
      .map((s) => s.crawl)
      .filter((c): c is UrlCrawl => Boolean(c))
      .filter((c) => c.status === "SUCCESS")
      .map((c) => c.id)
      .filter(Boolean);
  }, [snapshot]);

  const [sectionViewerOpen, setSectionViewerOpen] = useState(false);
  const [sectionViewerSrc, setSectionViewerSrc] = useState<string | null>(null);
  const [sectionViewerTitle, setSectionViewerTitle] = useState<string>("Section");

  const [baselineRunIsPublished, setBaselineRunIsPublished] = useState(false);
  const [baselineRunTags, setBaselineRunTags] = useState<string[]>([]);
  const [baselinePublishedCrawlIds, setBaselinePublishedCrawlIds] = useState<Set<string>>(new Set());
  const [baselinePublishedSectionIds, setBaselinePublishedSectionIds] = useState<Set<string>>(new Set());

  const [draftRunIsPublished, setDraftRunIsPublished] = useState(false);
  const [draftRunTags, setDraftRunTags] = useState<string[]>([]);
  const [draftPublishedCrawlIds, setDraftPublishedCrawlIds] = useState<Set<string>>(new Set());
  const [draftPublishedSectionIds, setDraftPublishedSectionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const runIsPublished = Boolean(run.isPublished);
    const runTags = Array.isArray(run.tags) ? run.tags : [];

    const publishedCrawlIds = new Set(
      snapshot
        .map((s) => s.crawl)
        .filter(Boolean)
        .filter((c) => c?.isPublished)
        .map((c) => c?.id)
        .filter(Boolean) as string[],
    );

    const crawlsWithPublishedScreenshots = new Set(
      snapshot
        .map((s) => s.crawl)
        .filter((c): c is UrlCrawl => Boolean(c?.id))
        .filter((c) => c.status === "SUCCESS")
        .filter((c) => {
          const screenshots = c.screenshots ?? [];
          const sections = c.sections ?? [];
          return screenshots.some((s) => Boolean(s?.isPublished)) || sections.some((s) => Boolean(s?.isPublished));
        })
        .map((c) => c.id),
    );

    const publishedSectionIds = new Set(
      homepageSections
        .filter((s) => s?.isPublished)
        .map((s) => s.id)
        .filter(Boolean),
    );

    setBaselineRunIsPublished(runIsPublished);
    setBaselineRunTags(runTags);
    setBaselinePublishedCrawlIds(publishedCrawlIds);
    setBaselinePublishedSectionIds(publishedSectionIds);

    setDraftRunIsPublished(runIsPublished);
    setDraftRunTags(runTags);
    setDraftPublishedCrawlIds(new Set([...publishedCrawlIds, ...crawlsWithPublishedScreenshots]));
    setDraftPublishedSectionIds(publishedSectionIds);
  }, [run.id, run.isPublished, run.tags, snapshot, homepageSections]);

  useEffect(() => {
    if (draftRunIsPublished || draftPublishedCrawlIds.size) {
      onDraftWantsDomainPublished();
    }
  }, [draftPublishedCrawlIds.size, draftRunIsPublished, onDraftWantsDomainPublished]);

  const hasRedesignTag = useMemo(() => draftRunTags.includes("redesign"), [draftRunTags]);

  const homepageCrawlId = homepageSnapshot?.crawl?.id ?? null;
  const homepageIsEnabled = Boolean(homepageCrawlId && draftPublishedCrawlIds.has(homepageCrawlId));
  const canPickSections = Boolean(
    homepageSnapshot?.crawl?.id && homepageSnapshot.crawl.status === "SUCCESS" && canPublishSelection && homepageIsEnabled,
  );

  const changes = useMemo(() => {
    const crawlsToPublish = [...draftPublishedCrawlIds].filter((id) => !baselinePublishedCrawlIds.has(id));
    const crawlsToUnpublish = [...baselinePublishedCrawlIds].filter((id) => !draftPublishedCrawlIds.has(id));
    const sectionsToPublish = [...draftPublishedSectionIds].filter((id) => !baselinePublishedSectionIds.has(id));
    const sectionsToUnpublish = [...baselinePublishedSectionIds].filter((id) => !draftPublishedSectionIds.has(id));

    const tagsChanged = (() => {
      const a = [...new Set(baselineRunTags)].sort().join("|");
      const b = [...new Set(draftRunTags)].sort().join("|");
      return a !== b;
    })();

    return {
      runIsPublishedChanged: draftRunIsPublished !== baselineRunIsPublished,
      runTagsChanged: tagsChanged,
      crawlsToPublish,
      crawlsToUnpublish,
      sectionsToPublish,
      sectionsToUnpublish,
    };
  }, [
    baselinePublishedCrawlIds,
    baselinePublishedSectionIds,
    baselineRunIsPublished,
    baselineRunTags,
    draftPublishedCrawlIds,
    draftPublishedSectionIds,
    draftRunIsPublished,
    draftRunTags,
  ]);

  const hasChanges =
    changes.runIsPublishedChanged ||
    changes.runTagsChanged ||
    changes.crawlsToPublish.length ||
    changes.crawlsToUnpublish.length ||
    changes.sectionsToPublish.length ||
    changes.sectionsToUnpublish.length;

  const resetDraftToBaseline = () => {
    setDraftRunIsPublished(baselineRunIsPublished);
    setDraftRunTags(baselineRunTags);
    setDraftPublishedCrawlIds(new Set(baselinePublishedCrawlIds));
    setDraftPublishedSectionIds(new Set(baselinePublishedSectionIds));
  };

  const { mutate: savePublication, mutation: savePublicationMutation } = useCustomMutation<
    BaseRecord,
    HttpError,
    {
      crawlRunIsPublished?: boolean;
      crawlRunTags?: string[];
      markReviewed?: boolean;
      crawlsToPublish?: string[];
      crawlsToUnpublish?: string[];
      sectionsToPublish?: string[];
      sectionsToUnpublish?: string[];
    }
  >();

  const runLabelTime = runTime(run);
  const runLabelTimeMs = parseMs(runLabelTime);
  const runLabel = runLabelTimeMs ? new Date(runLabelTimeMs).toLocaleString() : run.createdAt ? new Date(run.createdAt).toLocaleString() : "-";

  if (snapshotQuery.isError) {
    return (
      <Card size="small">
        <Typography.Text type="danger">{(snapshotQuery.error as HttpError).message}</Typography.Text>
      </Card>
    );
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Card size="small">
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
            >
              {run.status}
            </Tag>
            {run.isPublished ? <Tag color="green">PUBLISHED</Tag> : null}
            {run.reviewStatus === "PENDING_REVIEW" ? <Tag color="gold">NEEDS REVIEW</Tag> : null}
            <Typography.Text>{runLabel}</Typography.Text>
            <Typography.Text type="secondary">{run.id}</Typography.Text>
            {run.jobId ? <Link to={`/jobs/show/${run.jobId}`}>Job</Link> : null}
            {run.error ? <Typography.Text type="secondary">· {run.error}</Typography.Text> : null}
          </Space>
        </Space>
      </Card>

      {!canPublishSelection ? (
        <Alert
          type="warning"
          showIcon
          message="This crawl run is not SUCCESS yet."
          description="Publishing controls are disabled until the crawl run succeeds."
        />
      ) : null}

      <Card size="small">
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Space wrap>
              <Typography.Text strong>Publish settings</Typography.Text>
              {hasChanges ? <Tag color="orange">Unsaved changes</Tag> : null}
              {draftRunIsPublished ? <Tag color="green">Run published</Tag> : <Tag>Run not published</Tag>}
            </Space>
            <Space wrap>
              <Tooltip
                title={
                  run.reviewStatus === "PENDING_REVIEW"
                    ? "Marks this crawl run as reviewed without publishing it (removes it from Reviews)."
                    : null
                }
              >
                <Button
                  disabled={!canPublishSelection || run.reviewStatus !== "PENDING_REVIEW"}
                  loading={savePublicationMutation.isPending}
                  onClick={() => {
                    if (!canPublishSelection) return;
                    if (run.reviewStatus !== "PENDING_REVIEW") return;
                    savePublication(
                      {
                        url: `/admin/crawl-runs/${run.id}/publication`,
                        method: "patch",
                        values: { markReviewed: true },
                        successNotification: () => ({ message: "Marked as reviewed", type: "success" }),
                        errorNotification: (e) => ({
                          message: e?.message ?? "Failed to mark as reviewed",
                          type: "error",
                        }),
                      },
                      {
                        onSuccess: () => {
                          onUpdated();
                          snapshotQuery.refetch();
                        },
                      },
                    );
                  }}
                >
                  Mark reviewed
                </Button>
              </Tooltip>
              <Button disabled={!hasChanges} onClick={resetDraftToBaseline}>
                Reset
              </Button>
              <Button
                type="primary"
                disabled={!hasChanges || !canPublishSelection}
                loading={savePublicationMutation.isPending}
                onClick={() => {
                  if (!canPublishSelection) return;
                  savePublication(
                    {
                      url: `/admin/crawl-runs/${run.id}/publication`,
                      method: "patch",
                      values: {
                        ...(changes.runIsPublishedChanged ? { crawlRunIsPublished: draftRunIsPublished } : {}),
                        ...(changes.runTagsChanged ? { crawlRunTags: draftRunTags } : {}),
                        markReviewed: true,
                        crawlsToPublish: changes.crawlsToPublish,
                        crawlsToUnpublish: changes.crawlsToUnpublish,
                        sectionsToPublish: changes.sectionsToPublish,
                        sectionsToUnpublish: changes.sectionsToUnpublish,
                      },
                      successNotification: () => ({ message: "Saved", type: "success" }),
                      errorNotification: (e) => ({ message: e?.message ?? "Failed to save", type: "error" }),
                    },
                    {
                      onSuccess: () => {
                        onUpdated();
                        snapshotQuery.refetch();
                      },
                    },
                  );
                }}
              >
                Save
              </Button>
            </Space>
          </Space>

          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Space wrap>
              <Typography.Text type="secondary">Publish this crawl run</Typography.Text>
              <Switch checked={draftRunIsPublished} disabled={!canPublishSelection} onChange={(v) => setDraftRunIsPublished(v)} />
            </Space>
            <Space wrap>
              <Typography.Text type="secondary">Redesign</Typography.Text>
              <Switch
                checked={hasRedesignTag}
                disabled={!canPublishSelection}
                onChange={(v) =>
                  setDraftRunTags((prev) => {
                    const next = new Set(prev);
                    if (v) next.add("redesign");
                    else next.delete("redesign");
                    return [...next];
                  })
                }
              />
            </Space>
          </Space>

          <Divider style={{ margin: "6px 0" }} />

          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Space wrap>
              <Typography.Text type="secondary">Public URLs</Typography.Text>
              <Tag color={draftPublishedCrawlIds.size ? "green" : "default"}>
                {draftPublishedCrawlIds.size}/{selectableCrawlIds.length}
              </Tag>
              <Button
                size="small"
                disabled={!canPublishSelection || selectableCrawlIds.length === 0}
                onClick={() => setDraftPublishedCrawlIds(new Set(selectableCrawlIds))}
              >
                Select all
              </Button>
              <Button
                size="small"
                disabled={!draftPublishedCrawlIds.size}
                onClick={() => {
                  setDraftPublishedCrawlIds(new Set());
                  setDraftPublishedSectionIds(new Set());
                }}
              >
                Clear
              </Button>
            </Space>

            <Space wrap>
              <Typography.Text type="secondary">Public homepage sections</Typography.Text>
              <Tag color={draftPublishedSectionIds.size ? "green" : "default"}>
                {draftPublishedSectionIds.size}/{homepageSections.length}
              </Tag>
              <Tooltip title={canPickSections ? null : "Enable the homepage URL to pick sections"}>
                <Button
                  size="small"
                  disabled={!canPickSections || homepageSections.length === 0}
                  onClick={() => setDraftPublishedSectionIds(new Set(homepageSections.map((s) => s.id)))}
                >
                  Select all
                </Button>
              </Tooltip>
              <Button
                size="small"
                disabled={!draftPublishedSectionIds.size}
                onClick={() => setDraftPublishedSectionIds(new Set())}
              >
                Clear
              </Button>
            </Space>
          </Space>
        </Space>
      </Card>

      {snapshotErrors.length ? (
        <Card>
          <Typography.Text type="danger">
            GraphQL error: {snapshotErrors.map((e) => e.message).join(" · ")}
          </Typography.Text>
        </Card>
      ) : null}

      <AntdList
        grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 4 }}
        dataSource={snapshot}
        renderItem={({ url, crawl }) => {
          const screenshot = crawl?.screenshots?.[0]?.publicUrl ?? "/placeholder-site.svg";
          const cats = crawl?.categories?.map((c) => c.category?.name).filter(Boolean) ?? [];
          const tech =
            crawl?.technologies
              ?.map((t) => t.technology)
              .filter((t): t is NonNullable<typeof t> => Boolean(t)) ?? [];
          const canToggle = Boolean(crawl?.id && crawl.status === "SUCCESS" && canPublishSelection);
          const isEnabled = Boolean(crawl?.id && draftPublishedCrawlIds.has(crawl.id));

          const ribbonText = !crawl?.id
            ? "Not crawled"
            : !canPublishSelection
              ? "Not ready"
              : crawl.status !== "SUCCESS"
                ? "Not ready"
                : isEnabled
                  ? "Public"
                  : "Hidden";
          const ribbonColor = !crawl?.id
            ? "default"
            : !canPublishSelection || crawl.status !== "SUCCESS"
              ? "gold"
              : isEnabled
                ? "green"
                : "default";
          const opacity = !crawl?.id ? 0.25 : canToggle ? (isEnabled ? 1 : 0.6) : 0.35;

          return (
            <AntdList.Item key={url.id}>
              <div style={{ opacity, transition: "opacity 120ms ease" }}>
                <Badge.Ribbon text={ribbonText} color={ribbonColor}>
                  <WebsiteCard
                    title={`${url.type} · ${url.path}`}
                    url={url.normalizedUrl}
                    screenshotSrc={screenshot}
                    enableScreenshotViewer
                    onClick={
                      canToggle
                        ? () => {
                            setDraftPublishedCrawlIds((prev) => {
                              const next = new Set(prev);
                              if (crawl?.id && next.has(crawl.id)) {
                                next.delete(crawl.id);
                                if (url.type === "HOMEPAGE") {
                                  setDraftPublishedSectionIds(new Set());
                                }
                              } else if (crawl?.id) {
                                next.add(crawl.id);
                              }
                              return next;
                            });
                          }
                        : undefined
                    }
                    tags={[
                      crawl?.status
                        ? {
                            label: `crawl: ${crawl.status}`,
                            color:
                              crawl.status === "SUCCESS"
                                ? "green"
                                : crawl.status === "FAILED"
                                  ? "red"
                                  : crawl.status === "RUNNING"
                                    ? "blue"
                                    : "default",
                          }
                        : { label: "not crawled in this run" },
                      ...(crawl?.id ? [{ label: isEnabled ? "public" : "private", color: isEnabled ? "green" : "default" }] : []),
                      ...(cats.length ? [{ label: `cat: ${cats.slice(0, 2).join(" · ")}` }] : []),
                      ...tech.slice(0, 2).map((t) => ({
                        key: `tech:${t.id ?? t.slug ?? t.name}`,
                        label: (
                          <Space size={6}>
                            {t.iconPublicUrl ? (
                              <img
                                src={getDisplayImageSrc(t.iconPublicUrl, { placeholder: "/placeholder-site.svg" })}
                                alt=""
                                width={14}
                                height={14}
                                style={{ display: "block" }}
                              />
                            ) : null}
                            {t.name}
                          </Space>
                        ),
                      })),
                    ]}
                    extra={
                      <Space onClick={(e) => e.stopPropagation()}>
                        {crawl ? (
                          <Typography.Link
                            onClick={() => {
                              onInspectCrawl(url, crawl);
                            }}
                          >
                            Inspect crawl
                          </Typography.Link>
                        ) : null}
                        <Tag>
                          {crawl
                            ? new Date(parseMs(crawl.crawledAt ?? crawl.finishedAt ?? crawl.createdAt)).toLocaleDateString()
                            : "-"}
                        </Tag>
                      </Space>
                    }
                  />
                </Badge.Ribbon>
              </div>
            </AntdList.Item>
          );
        }}
      />

      {homepageSections.length ? (
        <Card size="small" title={`Homepage sections (${homepageSections.length})`}>
          {!canPickSections ? (
            <Alert
              style={{ marginBottom: 12 }}
              type="warning"
              showIcon
              message="Enable the homepage URL (in Public URLs) to pick sections."
            />
          ) : null}
          <Space size={12} wrap>
            {homepageSections.map((section) => {
              const isEnabled = draftPublishedSectionIds.has(section.id);
              const canToggle = canPickSections;
              return (
                <div
                  key={section.id}
                  style={{
                    width: 220,
                    cursor: canToggle ? "pointer" : "not-allowed",
                    opacity: isEnabled ? 1 : 0.6,
                    transition: "opacity 120ms ease",
                  }}
                  onClick={() => {
                    if (!canToggle) return;
                    setDraftPublishedSectionIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(section.id)) next.delete(section.id);
                      else next.add(section.id);
                      return next;
                    });
                  }}
                >
                  <Card
                    size="small"
                    styles={{ body: { padding: 8 } }}
                    cover={
                      <img
                        src={getDisplayImageSrc(section.publicUrl ?? undefined)}
                        alt={`Section ${section.index}`}
                        style={{ width: "100%", height: 140, objectFit: "cover", objectPosition: "top" }}
                      />
                    }
                  >
                    <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
                      <Typography.Text>Section {section.index}</Typography.Text>
                      <Space wrap>
                        <Tag color={isEnabled ? "green" : "default"}>{isEnabled ? "public" : "private"}</Tag>
                        <Button
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSectionViewerTitle(`Section ${section.index}`);
                            setSectionViewerSrc(getDisplayImageSrc(section.publicUrl ?? undefined));
                            setSectionViewerOpen(true);
                          }}
                        >
                          View
                        </Button>
                      </Space>
                    </Space>
                  </Card>
                </div>
              );
            })}
          </Space>
        </Card>
      ) : null}

      <Modal
        title={sectionViewerTitle}
        open={sectionViewerOpen}
        onCancel={() => setSectionViewerOpen(false)}
        footer={null}
        centered
        width={1240}
        styles={{ body: { padding: 0 } }}
      >
        <div
          style={{
            maxHeight: "calc(100vh - 220px)",
            overflowY: "auto",
            overflowX: "auto",
            padding: 16,
            textAlign: "center",
            background: "#0b1020",
          }}
        >
          <img
            src={sectionViewerSrc ?? "/placeholder-site.svg"}
            alt={sectionViewerTitle}
            style={{
              width: "min(100%, 1180px)",
              height: "auto",
              display: "block",
              margin: "0 auto",
              background: "#fff",
              borderRadius: 8,
            }}
          />
        </div>
      </Modal>
    </Space>
  );
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
    [runsSorted],
  );

  const latestRun = runsSorted[0] ?? null;
  const publishedRuns = useMemo(() => runsSorted.filter((r) => r.isPublished), [runsSorted]);

  const [openInitialized, setOpenInitialized] = useState(false);
  const [openRunIds, setOpenRunIds] = useState<string[]>([]);

  useEffect(() => {
    setOpenInitialized(false);
    setOpenRunIds([]);
  }, [domainId]);

  const defaultOpenIds = useMemo(() => {
    const ids = [latestRun?.id, ...publishedRuns.map((r) => r.id)].filter(Boolean) as string[];
    return Array.from(new Set(ids));
  }, [latestRun?.id, publishedRuns]);

  useEffect(() => {
    if (openInitialized) return;
    setOpenRunIds(defaultOpenIds);
    setOpenInitialized(true);
  }, [defaultOpenIds, openInitialized]);

  const { mutate: patchDomain, mutation: patchDomainMutation } = useCustomMutation<
    Domain,
    HttpError,
    { isPublished: boolean }
  >();

  const [baselineDomainIsPublished, setBaselineDomainIsPublished] = useState(false);
  const [draftDomainIsPublished, setDraftDomainIsPublished] = useState(false);
  const [domainPublishTouched, setDomainPublishTouched] = useState(false);

  useEffect(() => {
    const next = Boolean(domain?.isPublished);
    setBaselineDomainIsPublished(next);
    setDraftDomainIsPublished(next);
    setDomainPublishTouched(false);
  }, [domain?.id, domain?.isPublished]);

  useEffect(() => {
    if (!domain?.id) return;
    if (domainPublishTouched) return;
    if (baselineDomainIsPublished) return;
    if (draftDomainIsPublished !== baselineDomainIsPublished) return;
    if (publishedRuns.length) setDraftDomainIsPublished(true);
  }, [
    baselineDomainIsPublished,
    domain?.id,
    domainPublishTouched,
    draftDomainIsPublished,
    publishedRuns.length,
  ]);

  const enableDomainDraftIfUntouched = React.useCallback(() => {
    if (domainPublishTouched) return;
    setDraftDomainIsPublished((prev) => (prev ? prev : true));
  }, [domainPublishTouched]);

  const { query: latestSnapshotQuery, result: latestSnapshotResult } = useCustom<
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
        variables: { id: domainId, urlsLimit, runId: latestRun?.id },
      },
    },
    queryOptions: { enabled: Boolean(domainId && latestRun?.id) },
  });

  const latestSnapshotResponse = latestSnapshotResult.data as unknown as GqlResponse<DomainSnapshotData>;
  const latestSnapshotDomain = latestSnapshotResponse?.data?.domain ?? null;
  const latestSnapshotUrls = useMemo(() => latestSnapshotDomain?.urls ?? [], [latestSnapshotDomain?.urls]);

  const latestSnapshot = useMemo(() => {
    const crawlByUrlId = new Map<string, UrlCrawl | null>();
    for (const url of latestSnapshotUrls) {
      crawlByUrlId.set(url.id, url.crawlInRun ?? null);
    }
    return urls.map((url) => ({ url, crawl: crawlByUrlId.get(url.id) ?? null }));
  }, [latestSnapshotUrls, urls]);

  const latestHomepage = useMemo(() => {
    return latestSnapshot.find((s) => s.url.type === "HOMEPAGE") ?? latestSnapshot[0] ?? null;
  }, [latestSnapshot]);

  const mainScreenshotSrc = latestHomepage?.crawl?.screenshots?.[0]?.publicUrl ?? undefined;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<Url | null>(null);
  const [selectedCrawl, setSelectedCrawl] = useState<UrlCrawl | null>(null);

  if (query.isLoading) return <Card loading />;

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

  if (!domain) return <Empty description="Domain not found" />;

  const displayName = domain.profile?.name ?? domain.displayName ?? domain.host;

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
          { label: `crawl runs: ${runsSorted.length}` },
          ...(activeRuns.length ? [{ label: `active: ${activeRuns.length}` }] : []),
        ]}
      />

      <Card size="small">
        <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
          <Space wrap>
            <Typography.Text strong>Domain</Typography.Text>
            {baselineDomainIsPublished ? <Tag color="green">PUBLISHED</Tag> : <Tag>NOT PUBLISHED</Tag>}
            {draftDomainIsPublished !== baselineDomainIsPublished ? <Tag color="orange">Unsaved changes</Tag> : null}
          </Space>
          <Space wrap>
            <Typography.Text type="secondary">Published</Typography.Text>
            <Switch
              checked={draftDomainIsPublished}
              loading={patchDomainMutation.isPending}
              onChange={(v) => {
                setDraftDomainIsPublished(v);
                setDomainPublishTouched(true);
              }}
            />
            <Button
              size="small"
              disabled={draftDomainIsPublished === baselineDomainIsPublished}
              onClick={() => {
                setDraftDomainIsPublished(baselineDomainIsPublished);
                setDomainPublishTouched(false);
              }}
            >
              Reset
            </Button>
            <Button
              size="small"
              type="primary"
              loading={patchDomainMutation.isPending}
              disabled={draftDomainIsPublished === baselineDomainIsPublished}
              onClick={() => {
                patchDomain(
                  {
                    url: `/domains/${domain.id}`,
                    method: "patch",
                    values: { isPublished: draftDomainIsPublished },
                    successNotification: () => ({ message: "Domain updated", type: "success" }),
                    errorNotification: (e) => ({
                      message: e?.message ?? "Failed to update domain",
                      type: "error",
                    }),
                  },
                  { onSuccess: () => query.refetch() },
                );
              }}
            >
              Save
            </Button>
          </Space>
        </Space>
      </Card>

      <Card size="small">
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Typography.Text strong>Crawl runs</Typography.Text>
            <Typography.Text type="secondary">Latest open by default; published runs stay open.</Typography.Text>
          </Space>
          <Collapse
            activeKey={openRunIds}
            onChange={(keys) => setOpenRunIds(toArrayKeys(keys as unknown as string | string[]))}
            items={runsSorted
              .slice()
              .sort((a, b) => compareMs(runTime(a), runTime(b)))
              .map((run) => {
                const ms = parseMs(runTime(run));
                const label = ms ? new Date(ms).toLocaleString() : "-";
                const isOpen = openRunIds.includes(run.id);

                return {
                  key: run.id,
                  label: (
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
                      >
                        {run.status}
                      </Tag>
                      {run.isPublished ? <Tag color="green">PUBLISHED</Tag> : null}
                      <Typography.Text>{label}</Typography.Text>
                      <Typography.Text type="secondary">{run.id}</Typography.Text>
                    </Space>
                  ),
	                  children: (
	                    <CrawlRunAccordionPanel
	                      domainId={domain.id}
	                      urls={urls}
	                      urlsLimit={urlsLimit}
	                      run={run}
	                      isOpen={isOpen}
	                      onUpdated={() => {
	                        query.refetch();
	                        latestSnapshotQuery.refetch();
	                      }}
	                      onDraftWantsDomainPublished={enableDomainDraftIfUntouched}
	                      onInspectCrawl={(url, crawl) => {
	                        setSelectedUrl(url);
	                        setSelectedCrawl(crawl);
	                        setDrawerOpen(true);
	                      }}
	                    />
	                  ),
                };
              })}
          />
        </Space>
      </Card>

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
