import { Edit, useForm } from "@refinedev/antd";
import type { HttpError } from "@refinedev/core";
import { Form, Input } from "antd";
import React from "react";
import type { Technology } from "../../types/collect";

type TechnologyUpdateVariables = Partial<Pick<Technology, "slug" | "name" | "websiteUrl">>;

export const TechnologyEdit: React.FC = () => {
  const { formProps, saveButtonProps } = useForm<Technology, HttpError, TechnologyUpdateVariables>({
    resource: "technologies",
    redirect: "show",
  });

  return (
    <Edit title="Edit technology" saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Name" name="name">
          <Input />
        </Form.Item>
        <Form.Item label="Slug" name="slug">
          <Input />
        </Form.Item>
        <Form.Item label="Website URL" name="websiteUrl">
          <Input />
        </Form.Item>
      </Form>
    </Edit>
  );
};

