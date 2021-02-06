import { Button, Select, Space } from "antd"
import { PlusOutlined } from '@ant-design/icons';

export default function Home() {
  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical">
        <Space>
          <Select
            showSearch
            placeholder="Search"
            filterOption={false}
            defaultActiveFirstOption={false}
            onChange={(value, option) => ({})}
            onSearch={(value) => ({})}
          >
            <Select.Option key={0}>Option 1</Select.Option>
          </Select>
          <Button
            type="primary"
            icon={<PlusOutlined />}
          >
            Add Symbol
          </Button>
        </Space>
        <div>List</div>
      </Space>
    </div>
  )
}
