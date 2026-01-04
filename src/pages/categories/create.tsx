import { Create, useForm } from "@refinedev/antd";
import type { HttpError } from "@refinedev/core";
import { Form, Input } from "antd";
import React from "react";
import type { Category } from "../../types/collect";

type CategoryCreateVariables = Pick<Category, "slug" | "name"> & { description?: string };

export const CategoryCreate: React.FC = () => {
  const { formProps, saveButtonProps } = useForm<Category, HttpError, CategoryCreateVariables>({
    resource: "categories",
    redirect: "list",
  });

  return (
    <Create title="Create category" saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Name" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Slug" name="slug" rules={[{ required: true }]}>
          <Input placeholder="e-commerce" />
        </Form.Item>
        <Form.Item label="Description" name="description">
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Create>
  );
};

