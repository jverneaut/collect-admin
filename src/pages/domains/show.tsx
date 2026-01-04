import { Show } from "@refinedev/antd";
import type { HttpError } from "@refinedev/core";
import { useCreate, useCustom, useCustomMutation, useList, useNavigation, useOne, useShow } from "@refinedev/core";
import { Button, Card, Col, Descriptions, Drawer, Form, Input, List as AntdList, Modal, Row, Select, Space, Switch, Tabs, Tag, Typography } from "antd";
import React, { useMemo, useState } from "react";
import { Link } from "react-router";
import { CrawlDetailsTabs, DomainTimelineExplorer, UrlCrawlExplorer, WebsiteCard } from "../../components";
import type { Domain, Job, Url, UrlCrawl } from "../../types/collect";
import { getDisplayImageSrc } from "../../lib/media";

type GqlError = { message: string };
type GqlResponse<T> = { data?: T; errors?: GqlError[] };

type DomainCrawlHistoryData = {
  domain: (Domain & {
    urls: Array<
      Url & {
        crawls: Array<Pick<UrlCrawl, "id" | "urlId" | "crawlRunId" | "status" | "createdAt">>;
      }
    >;
  }) | null;
};

const DOMAIN_CRAWL_HISTORY_QUERY = `
  query DomainCrawlHistory($id: ID!, $urlsLimit: Int = 50, $crawlsLimit: Int = 50) {
    domain(id: $id) {
      id
      urls(limit: $urlsLimit) {
        id
        type
        path
        normalizedUrl
        crawls(limit: $crawlsLimit) {
          id
          urlId
          crawlRunId
          status
          createdAt
        }
      }
    }
  }
`;

type CreateUrlVariables = {
  url: string;
  type: Url["type"];
  isCanonical: boolean;
};

const URL_TYPES: Array<{ label: string; value: Url["type"] }> = [
  { label: "Homepage", value: "HOMEPAGE" },
  { label: "About", value: "ABOUT" },
  { label: "Contact", value: "CONTACT" },
  { label: "Pricing", value: "PRICING" },
  { label: "Blog", value: "BLOG" },
  { label: "Careers", value: "CAREERS" },
  { label: "Docs", value: "DOCS" },
  { label: "Terms", value: "TERMS" },
  { label: "Privacy", value: "PRIVACY" },
  { label: "Other", value: "OTHER" },
];

export const DomainShow: React.FC = () => {
  const { list } = useNavigation();
  const { query, result } = useShow<Domain>({
    resource: "domains",
    queryOptions: { refetchInterval: 5000 },
  });
  const record = result;

  const [createUrlOpen, setCreateUrlOpen] = useState(false);
  const [createUrlForm] = Form.useForm<CreateUrlVariables>();

  const [selectedUrlId, setSelectedUrlId] = useState<string | null>(null);

  const { mutate: createUrl, mutation: createUrlMutation } = useCreate<
    Url,
    HttpError,
    CreateUrlVariables
  >();

  const { query: jobsQuery, result: jobsResult } = useList<Job, HttpError>({
    resource: "jobs",
    pagination: { mode: "off" },
    queryOptions: { refetchInterval: 2000 },
  });

  const { mutate: ingestDomain, mutation: ingestMutation } = useCustomMutation<Job, HttpError, Record<string, unknown>>();

  const domainId = record?.id ?? null;

  const { query: historyQuery, result: historyResult } = useCustom<
    DomainCrawlHistoryData,
    HttpError,
    unknown,
    { query: string; variables: Record<string, unknown> },
    DomainCrawlHistoryData
  >({
    url: "/graphql",
    method: "post",
    config: { payload: { query: DOMAIN_CRAWL_HISTORY_QUERY, variables: { id: domainId, urlsLimit: 50, crawlsLimit: 50 } } },
    queryOptions: { enabled: Boolean(domainId) },
  });

  const historyResponse = historyResult.data as unknown as GqlResponse<DomainCrawlHistoryData>;
  const historyErrors = historyResponse?.errors ?? [];
  const historyDomain = historyResponse?.data?.domain ?? null;
  const historyUrls = useMemo(() => historyDomain?.urls ?? [], [historyDomain?.urls]);

  const [crawlDrawerOpen, setCrawlDrawerOpen] = useState(false);
  const [selectedCrawlRef, setSelectedCrawlRef] = useState<{ urlId: string; crawlId: string } | null>(null);

  const { query: crawlQuery, result: crawlResult } = useOne<UrlCrawl, HttpError>({
    resource: "crawls",
    id: selectedCrawlRef?.crawlId ?? "",
    meta: { urlId: selectedCrawlRef?.urlId },
    queryOptions: { enabled: Boolean(selectedCrawlRef?.urlId && selectedCrawlRef?.crawlId) },
  });

  const urls = useMemo(() => record?.urls ?? [], [record?.urls]);
  const derived = record?.derived;
  const derivedCategories = derived?.categories?.map((c) => c.name).filter(Boolean) ?? [];
  const derivedTechnologies = derived?.technologies?.map((t) => t.name).filter(Boolean) ?? [];
  const homepageSections = derived?.homepageLatestCrawl?.sections ?? [];
  const homepageSectionsPreview = homepageSections.slice(0, 8);

  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const [sectionViewerOpen, setSectionViewerOpen] = useState(false);
  const [sectionViewerSrc, setSectionViewerSrc] = useState<string | null>(null);
  const [sectionViewerTitle, setSectionViewerTitle] = useState<string | null>(null);

  const domainJobs = useMemo(() => {
    const jobs = jobsResult.data ?? [];
    return jobs.filter((j) => {
      const input = j.input as { domainId?: unknown; input?: unknown } | null;
      const domainId = typeof input?.domainId === "string" ? input.domainId : null;
      const nestedDomainId =
        typeof (input?.input as { domainId?: unknown } | undefined)?.domainId === "string"
          ? ((input?.input as { domainId?: string }).domainId ?? null)
          : null;
      return domainId === record?.id || nestedDomainId === record?.id;
    });
  }, [jobsResult.data, record?.id]);

  React.useEffect(() => {
    if (!record) return;
    if (selectedUrlId && urls.some((u) => u.id === selectedUrlId)) return;
    const homepage = urls.find((u) => u.type === "HOMEPAGE") ?? urls[0] ?? null;
    setSelectedUrlId(homepage?.id ?? null);
  }, [record, selectedUrlId, urls]);

  if (!record) {
    return (
      <Show isLoading={query.isLoading} title="Domain">
        <div />
      </Show>
    );
  }

  const displayName = record.profile?.name ?? record.displayName ?? record.host;

  return (
    <Show
      isLoading={query.isLoading}
      title={displayName}
      headerButtons={({ defaultButtons }) => (
        <Space>
          <Button onClick={() => list("domains")}>Back</Button>
          {defaultButtons}
          <Button type="primary" onClick={() => setCreateUrlOpen(true)}>
            Add URL
          </Button>
        </Space>
      )}
    >
      <Tabs
        defaultActiveKey="overview"
        items={[
          {
            key: "overview",
            label: "Overview",
            children: (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <WebsiteCard
                  title={displayName}
                  url={record.canonicalUrl}
                  description={record.profile?.description ?? null}
                  screenshotSrc={record.derived?.screenshot?.publicUrl ?? undefined}
                  enableScreenshotViewer
                  tags={[
                    { label: `host: ${record.host}` },
                    { label: `urls: ${record.urlsCount ?? urls.length}` },
                    ...(derived?.primaryCategory ? [{ label: `primary: ${derived.primaryCategory.name}` }] : []),
                  ]}
                />

                <Descriptions bordered size="small" column={1} styles={{ content: { wordBreak: "break-word" } }}>
                  <Descriptions.Item label="ID">{record.id}</Descriptions.Item>
                  <Descriptions.Item label="Host">{record.host}</Descriptions.Item>
                  <Descriptions.Item label="Canonical URL">{record.canonicalUrl}</Descriptions.Item>
                  <Descriptions.Item label="Created">{new Date(record.createdAt).toLocaleString()}</Descriptions.Item>
                  <Descriptions.Item label="Updated">{new Date(record.updatedAt).toLocaleString()}</Descriptions.Item>
                  <Descriptions.Item label="Profile name">{record.profile?.name ?? "-"}</Descriptions.Item>
                  <Descriptions.Item label="Profile description">{record.profile?.description ?? "-"}</Descriptions.Item>
                  <Descriptions.Item label="Derived categories">
                    {derivedCategories.length ? (
                      <Space wrap>
                        {derivedCategories.slice(0, 12).map((c) => (
                          <Tag key={c}>{c}</Tag>
                        ))}
                      </Space>
                    ) : (
                      "-"
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Derived technologies">
                    {derivedTechnologies.length ? (
                      <Space wrap>
                        {derivedTechnologies.slice(0, 12).map((t) => (
                          <Tag key={t}>{t}</Tag>
                        ))}
                      </Space>
                    ) : (
                      "-"
                    )}
                  </Descriptions.Item>
                </Descriptions>

                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
                    <Typography.Title level={4} style={{ margin: 0 }}>
                      Homepage sections
                    </Typography.Title>
                    <Typography.Text type="secondary">
                      {derived?.homepageLatestCrawl?.id ? `crawl: ${derived.homepageLatestCrawl.id}` : "crawl: -"}
                    </Typography.Text>
                  </Space>

                  {homepageSectionsPreview.length ? (
                    <Row gutter={[16, 16]}>
                      {homepageSectionsPreview.map((section) => (
                        <Col key={section.id} xs={24} md={12}>
                          <Card
                            hoverable
                            styles={{ body: { padding: 12 } }}
                            cover={
                              <div
                                style={{
                                  position: "relative",
                                  width: "100%",
                                  aspectRatio: "16 / 9",
                                  overflow: "hidden",
                                }}
                              >
                                <img
                                  src={getDisplayImageSrc(section.publicUrl)}
                                  alt={`Section ${section.index}`}
                                  style={{
                                    position: "absolute",
                                    inset: 0,
                                    height: "100%",
                                    width: "100%",
                                    objectFit: "cover",
                                    objectPosition: "top",
                                    display: "block",
                                  }}
                                />
                                <div
                                  style={{
                                    position: "absolute",
                                    inset: 0,
                                    display: "flex",
                                    alignItems: "flex-end",
                                    justifyContent: "flex-end",
                                    padding: 10,
                                    background: "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))",
                                    opacity: hoveredSectionId === section.id ? 1 : 0,
                                    transition: "opacity 120ms ease",
                                    pointerEvents: hoveredSectionId === section.id ? "auto" : "none",
                                  }}
                                >
                                  <Button
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSectionViewerTitle(`Section ${section.index}`);
                                      setSectionViewerSrc(section.publicUrl ?? null);
                                      setSectionViewerOpen(true);
                                    }}
                                  >
                                    View section
                                  </Button>
                                </div>
                              </div>
                            }
                            onMouseEnter={() => setHoveredSectionId(section.id)}
                            onMouseLeave={() => setHoveredSectionId((id) => (id === section.id ? null : id))}
                          >
                            <Space direction="vertical" size={0} style={{ width: "100%" }}>
                              <Typography.Text strong>Section {section.index}</Typography.Text>
                              <Typography.Text type="secondary">
                                {section.format ?? "-"}
                              </Typography.Text>
                            </Space>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  ) : (
                    <Typography.Text type="secondary">
                      No sections yet. Check the crawl’s task list for a `SECTIONS` task status/error.
                    </Typography.Text>
                  )}

                  <Modal
                    title={sectionViewerTitle ?? "Section"}
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
                        src={getDisplayImageSrc(sectionViewerSrc)}
                        alt={sectionViewerTitle ?? "Section"}
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

                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    URLs
                  </Typography.Title>
                  <AntdList<Url>
                    dataSource={urls}
                    grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 4 }}
                    renderItem={(url) => {
                      const latest = url.crawls?.[0];
                      const categories = latest?.categories?.map((c) => c.category?.name).filter(Boolean) ?? [];
                      const technologies = latest?.technologies?.map((t) => t.technology?.name).filter(Boolean) ?? [];
                      const screenshotSrc = latest?.screenshots?.[0]?.publicUrl ?? undefined;
                      return (
                        <AntdList.Item key={url.id}>
                          <WebsiteCard
                            title={`${url.type} · ${url.path}`}
                            url={url.normalizedUrl}
                            screenshotSrc={screenshotSrc}
                            enableScreenshotViewer
                            tags={[
                              { label: `type: ${url.type}` },
                              latest?.status
                                ? {
                                    label: `crawl: ${latest.status}`,
                                    color: latest.status === "SUCCESS" ? "green" : "default",
                                  }
                                : { label: "crawl: n/a" },
                              ...(categories.length ? [{ label: `cat: ${categories.slice(0, 2).join(" · ")}` }] : []),
                              ...(technologies.length ? [{ label: `tech: ${technologies.slice(0, 2).join(" · ")}` }] : []),
                            ]}
                            extra={
                              <Space onClick={(e) => e.stopPropagation()}>
                                <Link to={`/domains/${record.id}/urls/show/${url.id}`}>Open</Link>
                                <Typography.Link onClick={() => setSelectedUrlId(url.id)}>Explore</Typography.Link>
                              </Space>
                            }
                          />
                        </AntdList.Item>
                      );
                    }}
                  />
                </Space>

                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    Crawl history
                  </Typography.Title>
                  <Card size="small" loading={historyQuery.isLoading}>
                    {historyQuery.isError ? (
                      <Typography.Text type="danger">{(historyQuery.error as HttpError).message}</Typography.Text>
                    ) : historyErrors.length ? (
                      <Typography.Text type="danger">
                        GraphQL error: {historyErrors.map((e) => e.message).join(" · ")}
                      </Typography.Text>
                    ) : (
                      <AntdList
                        dataSource={historyUrls}
                        renderItem={(url) => (
                          <AntdList.Item key={url.id}>
                            <Space direction="vertical" size={6} style={{ width: "100%" }}>
                              <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
                                <Space direction="vertical" size={0} style={{ minWidth: 220 }}>
                                  <Typography.Text strong>{`${url.type} · ${url.path}`}</Typography.Text>
                                  <Typography.Text type="secondary" ellipsis={{ tooltip: url.normalizedUrl }}>
                                    {url.normalizedUrl}
                                  </Typography.Text>
                                </Space>
                                <Link to={`/domains/${record.id}/urls/show/${url.id}`}>Open</Link>
                              </Space>

                              {url.crawls?.length ? (
                                <Space wrap>
                                  {url.crawls.map((c) => (
                                    <Tag
                                      key={c.id}
                                      color={
                                        c.status === "SUCCESS"
                                          ? "green"
                                          : c.status === "FAILED"
                                            ? "red"
                                            : c.status === "RUNNING"
                                              ? "blue"
                                              : "default"
                                      }
                                      style={{ cursor: "pointer", userSelect: "none" }}
                                      onClick={() => {
                                        setSelectedCrawlRef({ urlId: url.id, crawlId: c.id });
                                        setCrawlDrawerOpen(true);
                                      }}
                                    >
                                      {new Date(c.createdAt).toLocaleString()} · {c.status}
                                      {c.crawlRunId ? " · run" : ""}
                                    </Tag>
                                  ))}
                                </Space>
                              ) : (
                                <Typography.Text type="secondary">No crawls yet.</Typography.Text>
                              )}
                            </Space>
                          </AntdList.Item>
                        )}
                      />
                    )}
                  </Card>
                  <Typography.Text type="secondary">Click a crawl tag to inspect details.</Typography.Text>
                </Space>
              </Space>
            ),
          },
          {
            key: "explorer",
            label: "Timeline",
            children: (
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Tabs
                  defaultActiveKey="site"
                  items={[
                    {
                      key: "site",
                      label: "Site timeline",
                      children: <DomainTimelineExplorer domainId={record.id} />,
                    },
                    {
                      key: "url",
                      label: "Per-URL explorer",
                      children: (
                        <Space direction="vertical" size={12} style={{ width: "100%" }}>
                          <Space direction="vertical" size={6} style={{ width: "100%" }}>
                            <Typography.Text type="secondary">Pick a URL, then scrub its crawl timeline.</Typography.Text>
                            <Select
                              value={selectedUrlId ?? undefined}
                              onChange={(v) => setSelectedUrlId(v)}
                              style={{ width: "100%" }}
                              placeholder="Select a URL"
                              options={urls.map((u) => ({
                                value: u.id,
                                label: `${u.type} · ${u.normalizedUrl}`,
                              }))}
                            />
                          </Space>
                          {selectedUrlId ? <UrlCrawlExplorer urlId={selectedUrlId} pollIntervalMs={2000} /> : null}
                        </Space>
                      ),
                    },
                  ]}
                />
              </Space>
            ),
          },
          {
            key: "ingestion",
            label: "Ingestion & Jobs",
            children: (
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
                  <Space wrap>
                    <Typography.Text strong>Domain ingestion</Typography.Text>
                    <Typography.Text type="secondary">Discovers URLs, crawls screenshots + technologies.</Typography.Text>
                  </Space>
                  <Space wrap>
                    <Button
                      type="primary"
                      loading={ingestMutation.isPending}
                      onClick={() => {
                        ingestDomain(
                          {
                            url: `/domains/${record.id}/ingest`,
                            method: "post",
                            values: {
                              maxUrls: 20,
                              urlConcurrency: 3,
                            },
                            successNotification: () => ({ message: "Ingestion job enqueued", type: "success" }),
                          },
                          { onSuccess: () => jobsQuery.refetch() }
                        );
                      }}
                    >
                      Run ingestion now
                    </Button>
                    <Button onClick={() => jobsQuery.refetch()} loading={jobsQuery.isFetching}>
                      Refresh jobs
                    </Button>
                  </Space>
                </Space>

                {domainJobs.length ? (
                  <AntdList
                    dataSource={domainJobs}
                    renderItem={(job) => (
                      <AntdList.Item key={job.id}>
                        <Space direction="vertical" size={4} style={{ width: "100%" }}>
                          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
                            <Space wrap>
                              <Typography.Text strong>{job.type}</Typography.Text>
                              <Tag
                                color={
                                  job.status === "SUCCEEDED"
                                    ? "green"
                                    : job.status === "FAILED"
                                      ? "red"
                                      : job.status === "RUNNING"
                                        ? "blue"
                                        : "default"
                                }
                              >
                                {job.status}
                              </Tag>
                              <Typography.Text type="secondary">
                                {new Date(job.createdAt).toLocaleString()}
                              </Typography.Text>
                            </Space>
                            <Link to={`/jobs/show/${job.id}`}>Open</Link>
                          </Space>
                          {job.error?.message ? <Typography.Text type="danger">{job.error.message}</Typography.Text> : null}
                        </Space>
                      </AntdList.Item>
                    )}
                  />
                ) : jobsQuery.isLoading ? null : (
                  <Typography.Text type="secondary">No jobs for this domain yet.</Typography.Text>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Drawer
        title={selectedCrawlRef ? `Crawl ${selectedCrawlRef.crawlId}` : "Crawl"}
        open={crawlDrawerOpen}
        onClose={() => setCrawlDrawerOpen(false)}
        width={820}
      >
        <Card size="small" loading={crawlQuery.isLoading}>
          <CrawlDetailsTabs
            crawl={crawlResult ?? null}
            onUpdated={() => {
              crawlQuery.refetch();
              historyQuery.refetch();
            }}
          />
        </Card>
      </Drawer>

      <Modal
        title="Add URL"
        open={createUrlOpen}
        onCancel={() => setCreateUrlOpen(false)}
        okText="Create"
        confirmLoading={createUrlMutation.isPending}
        onOk={async () => {
          const values = await createUrlForm.validateFields();
          createUrl(
            {
              resource: "urls",
              meta: { domainId: record.id },
              values,
              successNotification: () => ({ message: "URL created", type: "success" }),
            },
            {
              onSuccess: async () => {
                setCreateUrlOpen(false);
                createUrlForm.resetFields();
                await query.refetch();
              },
            }
          );
        }}
      >
        <Form
          form={createUrlForm}
          layout="vertical"
          initialValues={{ type: "OTHER", isCanonical: false }}
        >
          <Form.Item
            label="URL"
            name="url"
            rules={[{ required: true, message: "URL is required" }]}
          >
            <Input placeholder={record.canonicalUrl} />
          </Form.Item>
          <Form.Item label="Type" name="type" rules={[{ required: true }]}>
            <Select options={URL_TYPES} />
          </Form.Item>
          <Form.Item label="Canonical" name="isCanonical" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Show>
  );
};
