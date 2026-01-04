import { DeleteButton, EditButton, List, ShowButton, useTable } from "@refinedev/antd";
import type { HttpError } from "@refinedev/core";
import { Space, Table, Typography } from "antd";
import React from "react";
import type { Technology } from "../../types/collect";

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

