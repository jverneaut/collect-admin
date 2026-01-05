import type { HttpError } from "@refinedev/core";
import { useCustomMutation } from "@refinedev/core";
import { Button, Card, Descriptions, Empty, Select, Space, Table, Tag, Tabs, Typography } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import type { CrawlCategory, CrawlTask, CrawlTechnology, Screenshot, SectionScreenshot, UrlCrawl } from "../../types/collect";
import { getDisplayImageSrc } from "../../lib/media";

export type CrawlDetailsTabsProps = {
  crawl?: UrlCrawl | null;
  onUpdated?: () => void;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export const CrawlDetailsTabs: React.FC<CrawlDetailsTabsProps> = ({ crawl, onUpdated }) => {
  const screenshots = useMemo(() => crawl?.screenshots ?? [], [crawl?.screenshots]);
  const sections = useMemo(() => crawl?.sections ?? [], [crawl?.sections]);
  const tasks = useMemo(() => crawl?.tasks ?? [], [crawl?.tasks]);
  const categories = useMemo(() => crawl?.categories ?? [], [crawl?.categories]);
  const technologies = useMemo(() => crawl?.technologies ?? [], [crawl?.technologies]);

  if (!crawl) return <Empty description="Select a crawl to inspect" />;

  const [nextCrawlStatus, setNextCrawlStatus] = useState(crawl.status);
  useEffect(() => setNextCrawlStatus(crawl.status), [crawl.id, crawl.status]);

  const { mutate: patchCrawl, mutation: patchCrawlMutation } = useCustomMutation<
    UrlCrawl,
    HttpError,
    Partial<Pick<UrlCrawl, "status">>
  >();

  const { mutate: patchTask, mutation: patchTaskMutation } = useCustomMutation<
    CrawlTask,
    HttpError,
    Partial<Pick<CrawlTask, "status" | "error">>
  >();

  return (
    <Tabs
      defaultActiveKey="overview"
      items={[
        {
          key: "overview",
          label: "Overview",
          children: (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Card size="small">
                <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
                  <Space wrap>
                    <Typography.Text strong>Admin actions</Typography.Text>
                    <Typography.Text type="secondary">Patch crawl status</Typography.Text>
                  </Space>
                  <Space wrap>
                    <Select
                      value={nextCrawlStatus}
                      style={{ width: 180 }}
                      onChange={(v) => setNextCrawlStatus(v)}
                      options={[
                        { value: "PENDING", label: "PENDING" },
                        { value: "RUNNING", label: "RUNNING" },
                        { value: "SUCCESS", label: "SUCCESS" },
                        { value: "FAILED", label: "FAILED" },
                      ]}
                    />
                    <Button
                      type="primary"
                      loading={patchCrawlMutation.isPending}
                      onClick={() => {
                        patchCrawl(
                          {
                            url: `/crawls/${crawl.id}`,
                            method: "patch",
                            values: { status: nextCrawlStatus },
                            successNotification: () => ({ message: "Crawl updated", type: "success" }),
                          },
                          { onSuccess: () => onUpdated?.() }
                        );
                      }}
                    >
                      Update
                    </Button>
                  </Space>
                </Space>
              </Card>

              <Descriptions bordered size="small" column={1} styles={{ content: { wordBreak: "break-word" } }}>
              <Descriptions.Item label="ID">{crawl.id}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={crawl.status === "SUCCESS" ? "green" : crawl.status === "FAILED" ? "red" : "default"}>
                  {crawl.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="HTTP status">{crawl.httpStatus ?? "-"}</Descriptions.Item>
              <Descriptions.Item label="Final URL">{crawl.finalUrl ?? "-"}</Descriptions.Item>
              <Descriptions.Item label="Title">{crawl.title ?? "-"}</Descriptions.Item>
              <Descriptions.Item label="Meta description">{crawl.metaDescription ?? "-"}</Descriptions.Item>
              <Descriptions.Item label="Language">{crawl.language ?? "-"}</Descriptions.Item>
              <Descriptions.Item label="Content hash">{crawl.contentHash ?? "-"}</Descriptions.Item>
              <Descriptions.Item label="Error">{crawl.error ?? "-"}</Descriptions.Item>
              <Descriptions.Item label="Started">{formatDate(crawl.startedAt)}</Descriptions.Item>
              <Descriptions.Item label="Finished">{formatDate(crawl.finishedAt)}</Descriptions.Item>
              <Descriptions.Item label="Crawled at">{formatDate(crawl.crawledAt)}</Descriptions.Item>
              <Descriptions.Item label="Created">{formatDate(crawl.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="Updated">{formatDate(crawl.updatedAt)}</Descriptions.Item>
              </Descriptions>
            </Space>
          ),
        },
        {
          key: "tasks",
          label: `Tasks (${tasks.length})`,
          children: (
            <Table<CrawlTask>
              rowKey="id"
              dataSource={tasks}
              pagination={{ pageSize: 10 }}
              columns={[
                { title: "Type", dataIndex: "type", key: "type" },
                {
                  title: "Status",
                  dataIndex: "status",
                  key: "status",
                  render: (_value: string, task) => (
                    <Space>
                      <Tag>{task.status}</Tag>
                      <Select
                        value={task.status}
                        size="small"
                        style={{ width: 140 }}
                        disabled={patchTaskMutation.isPending}
                        onChange={(status) => {
                          patchTask(
                            {
                              url: `/crawls/${crawl.id}/tasks/${task.type}`,
                              method: "patch",
                              values: { status },
                              successNotification: () => ({ message: "Task updated", type: "success" }),
                            },
                            { onSuccess: () => onUpdated?.() }
                          );
                        }}
                        options={[
                          { value: "PENDING", label: "PENDING" },
                          { value: "RUNNING", label: "RUNNING" },
                          { value: "SUCCESS", label: "SUCCESS" },
                          { value: "FAILED", label: "FAILED" },
                        ]}
                      />
                    </Space>
                  ),
                },
                { title: "Attempts", dataIndex: "attempts", key: "attempts" },
                { title: "Last attempt", dataIndex: "lastAttemptAt", key: "lastAttemptAt", render: (v: string | null) => formatDate(v) },
                { title: "Error", dataIndex: "error", key: "error", render: (v: string | null) => v ?? "-" },
              ]}
            />
          ),
        },
        {
          key: "screenshots",
          label: `Screenshots (${screenshots.length})`,
          children: screenshots.length ? (
            <Space size={16} wrap>
              {screenshots.map((s: Screenshot) => (
                <Card
                  key={s.id}
                  title={`${s.kind}`}
                  size="small"
                  style={{ width: 360 }}
                  cover={
                    <img
                      src={getDisplayImageSrc(s.publicUrl)}
                      alt={`Screenshot ${s.kind}`}
                      style={{
                        height: 200,
                        width: "100%",
                        objectFit: "cover",
                        objectPosition: "top",
                      }}
                    />
                  }
                >
                  <Space direction="vertical" size={0}>
                    <Typography.Text type="secondary">Created: {formatDate(s.createdAt)}</Typography.Text>
                    <Typography.Text type="secondary">
                      Size: {s.width ?? "?"}×{s.height ?? "?"}
                    </Typography.Text>
                    <Typography.Text type="secondary">Format: {s.format ?? "-"}</Typography.Text>
                    <Typography.Text type="secondary">Public URL: {s.publicUrl ?? "-"}</Typography.Text>
                  </Space>
                </Card>
              ))}
            </Space>
          ) : (
            <Empty description="No screenshots" />
          ),
        },
        {
          key: "sections",
          label: `Sections (${sections.length})`,
          children: sections.length ? (
            <Space size={16} wrap>
              {sections.map((s: SectionScreenshot) => (
                <Card
                  key={s.id}
                  title={`Section ${s.index}`}
                  size="small"
                  style={{ width: 360 }}
                  cover={
                    <img
                      src={getDisplayImageSrc(s.publicUrl)}
                      alt={`Section ${s.index}`}
                      style={{
                        height: 200,
                        width: "100%",
                        objectFit: "cover",
                        objectPosition: "top",
                      }}
                    />
                  }
                >
                  <Space direction="vertical" size={0}>
                    <Typography.Text type="secondary">Created: {formatDate(s.createdAt)}</Typography.Text>
                    <Typography.Text type="secondary">Format: {s.format ?? "-"}</Typography.Text>
                    <Typography.Text type="secondary">Public URL: {s.publicUrl ?? "-"}</Typography.Text>
                  </Space>
                </Card>
              ))}
            </Space>
          ) : (
            <Empty description="No sections" />
          ),
        },
        {
          key: "categories",
          label: `Categories (${categories.length})`,
          children: (
            <Table<CrawlCategory>
              rowKey={(r) => `${r.crawlId}:${r.categoryId}`}
              dataSource={categories}
              pagination={{ pageSize: 10 }}
              columns={[
                { title: "Name", key: "name", render: (_, r) => r.category?.name ?? "-" },
                { title: "Slug", key: "slug", render: (_, r) => r.category?.slug ?? "-" },
                { title: "Confidence", dataIndex: "confidence", key: "confidence", render: (v: number | null) => (typeof v === "number" ? v.toFixed(2) : "-") },
              ]}
            />
          ),
        },
        {
          key: "technologies",
          label: `Technologies (${technologies.length})`,
          children: (
            <Table<CrawlTechnology>
              rowKey={(r) => `${r.crawlId}:${r.technologyId}`}
              dataSource={technologies}
              pagination={{ pageSize: 10 }}
              columns={[
                {
                  title: "Name",
                  key: "name",
                  render: (_, r) =>
                    r.technology ? (
                      <Space size={8}>
                        {r.technology.iconPublicUrl ? (
                          <img
                            src={getDisplayImageSrc(r.technology.iconPublicUrl, { placeholder: "/placeholder-site.svg" })}
                            alt=""
                            width={16}
                            height={16}
                            style={{ display: "block" }}
                          />
                        ) : null}
                        <span>{r.technology.name}</span>
                      </Space>
                    ) : (
                      "-"
                    ),
                },
                { title: "Slug", key: "slug", render: (_, r) => r.technology?.slug ?? "-" },
                { title: "Confidence", dataIndex: "confidence", key: "confidence", render: (v: number | null) => (typeof v === "number" ? v.toFixed(2) : "-") },
                {
                  title: "Website",
                  key: "websiteUrl",
                  render: (_, r) => (r.technology?.websiteUrl ? <Typography.Link href={r.technology.websiteUrl} target="_blank" rel="noreferrer">{r.technology.websiteUrl}</Typography.Link> : "-"),
                },
              ]}
            />
          ),
        },
        {
          key: "raw",
          label: "Raw",
          children: (
            <pre style={{ margin: 0, padding: 12, background: "#0b1020", color: "#d6e4ff", borderRadius: 8, overflow: "auto" }}>
              {JSON.stringify(crawl, null, 2)}
            </pre>
          ),
        },
      ]}
    />
  );
};
