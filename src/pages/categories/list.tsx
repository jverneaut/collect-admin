import { DeleteButton, EditButton, List, ShowButton, useTable } from "@refinedev/antd";
import type { HttpError } from "@refinedev/core";
import { Space, Table } from "antd";
import React from "react";
import type { Category } from "../../types/collect";

export const CategoryList: React.FC = () => {
  const { tableProps } = useTable<Category, HttpError>({
    resource: "categories",
    pagination: { mode: "off" },
    syncWithLocation: true,
  });

  return (
    <List title="Categories">
      <Table<Category>
        {...tableProps}
        rowKey="id"
        columns={[
          { title: "Name", dataIndex: "name", key: "name" },
          { title: "Slug", dataIndex: "slug", key: "slug" },
          { title: "Description", dataIndex: "description", key: "description", render: (v: string | null) => v ?? "-" },
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

