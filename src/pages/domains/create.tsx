import { Create, useForm } from "@refinedev/antd";
import type { HttpError } from "@refinedev/core";
import { Form, Input, Switch } from "antd";
import React from "react";
import type { Domain } from "../../types/collect";

type DomainCreateVariables = {
  domain: string;
  createHomepageUrl: boolean;
  createInitialCrawl: boolean;
};

export const DomainCreate: React.FC = () => {
  const { formProps, saveButtonProps } = useForm<Domain, HttpError, DomainCreateVariables>({
    resource: "domains",
    redirect: "show",
  });

  return (
    <Create saveButtonProps={saveButtonProps} title="Add domain">
      <Form
        {...formProps}
        layout="vertical"
        initialValues={{
          createHomepageUrl: true,
          createInitialCrawl: true,
        }}
      >
        <Form.Item
          label="Domain"
          name="domain"
          rules={[{ required: true, message: "Domain is required" }]}
        >
          <Input placeholder="example.com" />
        </Form.Item>
        <Form.Item label="Create homepage URL" name="createHomepageUrl" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item label="Create initial crawl" name="createInitialCrawl" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Create>
  );
};
