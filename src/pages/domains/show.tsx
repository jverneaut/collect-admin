import { Show } from "@refinedev/antd";
import type { HttpError } from "@refinedev/core";
import { useCreate, useNavigation, useShow } from "@refinedev/core";
import { Button, Descriptions, Form, Input, List as AntdList, Modal, Select, Space, Switch, Tabs, Typography } from "antd";
import React, { useMemo, useState } from "react";
import { Link } from "react-router";
import { UrlCrawlExplorer, WebsiteCard } from "../../components";
import type { Domain, Url } from "../../types/collect";

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
  const { query, result } = useShow<Domain>({ resource: "domains" });
  const record = result;

  const [createUrlOpen, setCreateUrlOpen] = useState(false);
  const [createUrlForm] = Form.useForm<CreateUrlVariables>();

  const [selectedUrlId, setSelectedUrlId] = useState<string | null>(null);

  const { mutate: createUrl, mutation: createUrlMutation } = useCreate<
    Url,
    HttpError,
    CreateUrlVariables
  >();

  const urls = useMemo(() => record?.urls ?? [], [record?.urls]);

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
                  tags={[
                    { label: `host: ${record.host}` },
                    { label: `urls: ${urls.length}` },
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
                </Descriptions>

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
                      return (
                        <AntdList.Item key={url.id}>
                          <WebsiteCard
                            title={`${url.type} · ${url.path}`}
                            url={url.normalizedUrl}
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
              </Space>
            ),
          },
          {
            key: "explorer",
            label: "Crawl Explorer",
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
                {selectedUrlId ? <UrlCrawlExplorer urlId={selectedUrlId} /> : null}
              </Space>
            ),
          },
        ]}
      />

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
