import { Create, useForm } from "@refinedev/antd";
import type { HttpError } from "@refinedev/core";
import { Form, Input } from "antd";
import React from "react";
import type { Technology } from "../../types/collect";

type TechnologyCreateVariables = Pick<Technology, "slug" | "name"> & { websiteUrl?: string };

export const TechnologyCreate: React.FC = () => {
  const { formProps, saveButtonProps } = useForm<Technology, HttpError, TechnologyCreateVariables>({
    resource: "technologies",
    redirect: "list",
  });

  return (
    <Create title="Create technology" saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Name" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Slug" name="slug" rules={[{ required: true }]}>
          <Input placeholder="react" />
        </Form.Item>
        <Form.Item label="Website URL" name="websiteUrl">
          <Input placeholder="https://example.com" />
        </Form.Item>
      </Form>
    </Create>
  );
};

