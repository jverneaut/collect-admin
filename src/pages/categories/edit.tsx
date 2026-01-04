import { Edit, useForm } from "@refinedev/antd";
import type { HttpError } from "@refinedev/core";
import { Form, Input } from "antd";
import React from "react";
import type { Category } from "../../types/collect";

type CategoryUpdateVariables = Partial<Pick<Category, "slug" | "name" | "description">>;

export const CategoryEdit: React.FC = () => {
  const { formProps, saveButtonProps } = useForm<Category, HttpError, CategoryUpdateVariables>({
    resource: "categories",
    redirect: "show",
  });

  return (
    <Edit title="Edit category" saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Name" name="name">
          <Input />
        </Form.Item>
        <Form.Item label="Slug" name="slug">
          <Input />
        </Form.Item>
        <Form.Item label="Description" name="description">
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Edit>
  );
};

