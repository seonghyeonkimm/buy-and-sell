import { Button, Select, Space, Table } from "antd"
import { PlusOutlined } from '@ant-design/icons';
import { gql, useQuery } from "@apollo/client";

const STOCK_SUMMARIES_QUERY = gql`
  query allSumarries($yhCodeList: [String!]!) {
    stockSummaries(yhCodeList: $yhCodeList) {
      code
      companyName
      previousClose
      open
      bid
      ask
      daysRange
      yearRange
      volume
      avgVolume
      marketCap
      beta
      peRatio
      eps
      earningsDate
      forwardDividendAndYield
      exDividendDate
      thisYearTargetEst
      fetchedAt
    }
  }
`;

export default function Home() {
  const { data, loading } = useQuery(
    STOCK_SUMMARIES_QUERY,
    { variables: { yhCodeList: ['MSFT', 'AAPL', 'WORK', 'BABA'] } },
  );

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <Select
            showSearch
            placeholder="Search"
            filterOption={false}
            defaultActiveFirstOption={false}
            onChange={(value, option) => ({})}
            onSearch={(value) => ({})}
          >
            <Select.Option key={0} value={0}>Option 1</Select.Option>
          </Select>
          <Button
            type="primary"
            icon={<PlusOutlined />}
          >
            Add Symbol
          </Button>
        </Space>
        <Table
          bordered
          loading={loading}
          columns={COLUMNS}
          rowKey={record => record.code}
          dataSource={data?.stockSummaries}
        />
      </Space>
    </div>
  )
}


const COLUMNS = [
  {
    title: "Symbol",
    dataIndex: "code",
  },
  {
    title: "Name",
    dataIndex: "companyName",
  },
  {
    title: "Bid",
    dataIndex: "bid",
  },
  {
    title: "Ask",
    dataIndex: "ask",
  },
  {
    title: "Day's Range",
    dataIndex: "daysRange",
  },
  {
    title: "Date",
    dataIndex: "fetchedAt",
    render: (fetchedAt) => {
      const date = new Date(fetchedAt);
      return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    }
  },
];