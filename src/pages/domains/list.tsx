import { DeleteButton, List } from "@refinedev/antd";
import { useList, useNavigation } from "@refinedev/core";
import { Input, List as AntdList, Space, Typography } from "antd";
import React, { useMemo, useState } from "react";
import { WebsiteCard } from "../../components";
import type { DomainWithHomepage } from "../../types/collect";

export const DomainList: React.FC = () => {
  const { show } = useNavigation();
  const [searchValue, setSearchValue] = useState("");

  const { query, result } = useList<DomainWithHomepage>({
    resource: "domains",
    pagination: { mode: "off" },
    filters: searchValue.trim()
      ? [{ field: "search", operator: "contains", value: searchValue.trim() }]
      : [],
  });

  const items = useMemo(() => result.data ?? [], [result.data]);

  return (
    <List
      title="Domains"
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
      <AntdList
        loading={query.isLoading}
        dataSource={items}
        grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 4 }}
        renderItem={(domain) => {
          const homepageCrawl = domain.homepage?.crawls?.[0];
          const categories =
            homepageCrawl?.categories?.map((c) => c.category?.name).filter(Boolean) ?? [];

          const title = domain.profile?.name ?? domain.displayName ?? domain.host;
          const description = domain.profile?.description ?? null;

          return (
            <AntdList.Item key={domain.id}>
              <WebsiteCard
                title={title}
                url={domain.canonicalUrl}
                description={description}
                tags={[
                  homepageCrawl?.status ? { label: `crawl: ${homepageCrawl.status}`, color: homepageCrawl.status === "SUCCESS" ? "green" : "default" } : { label: "crawl: n/a" },
                  ...(categories.length ? [{ label: categories.slice(0, 2).join(" · ") }] : []),
                ]}
                onClick={() => show("domains", domain.id)}
                extra={
                  <Space onClick={(e) => e.stopPropagation()}>
                    <Typography.Link onClick={() => show("domains", domain.id)}>Open</Typography.Link>
                    <DeleteButton resource="domains" recordItemId={domain.id} size="small" />
                  </Space>
                }
              />
            </AntdList.Item>
          );
        }}
      />
    </List>
  );
};
