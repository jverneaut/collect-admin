import { DeleteButton, EditButton, List, ShowButton, useTable } from "@refinedev/antd";
import type { HttpError } from "@refinedev/core";
import { Space, Table, Typography } from "antd";
import React from "react";
import type { Technology } from "../../types/collect";
import { getDisplayImageSrc } from "../../lib/media";

export const TechnologyList: React.FC = () => {
  const { tableProps } = useTable<Technology, HttpError>({
    resource: "technologies",
    pagination: { mode: "off" },
    syncWithLocation: true,
  });

  return (
    <List title="Technologies">
      <Table<Technology>
        {...tableProps}
        rowKey="id"
        columns={[
          {
            title: "",
            key: "icon",
            width: 44,
            render: (_, record) =>
              record.iconPublicUrl ? (
                <img
                  src={getDisplayImageSrc(record.iconPublicUrl, { placeholder: "/placeholder-site.svg" })}
                  alt=""
                  width={20}
                  height={20}
                  style={{ display: "block" }}
                />
              ) : (
                "-"
              ),
          },
          { title: "Name", dataIndex: "name", key: "name" },
          { title: "Slug", dataIndex: "slug", key: "slug" },
          {
            title: "Website",
            dataIndex: "websiteUrl",
            key: "websiteUrl",
            render: (v: string | null) => (v ? <Typography.Link href={v} target="_blank" rel="noreferrer">{v}</Typography.Link> : "-"),
          },
          {
            title: "Actions",
            key: "actions",
            render: (_, record) => (
              <Space>
                <ShowButton hideText size="small" recordItemId={record.id} />
                <EditButton hideText size="small" recordItemId={record.id} />
                <DeleteButton hideText size="small" recordItemId={record.id} />
              </Space>
            ),
          },
        ]}
      />
    </List>
  );
};
