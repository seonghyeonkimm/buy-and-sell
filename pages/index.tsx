import { Button, message, Popconfirm, Select, Space, Table, Tag, Typography } from "antd"
import { gql, useLazyQuery, useQuery } from "@apollo/client";
import { useCallback, useMemo, useReducer, useRef, useState } from "react";
import { stat } from "fs";
import formatNumber from "../utils/formatNumber";

const STOCK_SUMMARIES_QUERY = gql`
  query stockSummaries($yhCodeList: [String!]!) {
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

const STOCK_SEARCHES_QUERY = gql`
  query stockSearches($q: String!) {
    stockSearches(q: $q) {
      quotes {
        exchange
        symbol
        index
        score
        typeDisp
        quoteType
        longname
        shortname
      }
    }
  }
`;

export default function Home() {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const [yhCodeList, setYhCodeList] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const cache = JSON.parse(localStorage.getItem('_userPortfolio') || '[]');
      return cache;
    } catch (e) {
      return [];
    }
  });
  const [
    getStockSearches,
    {
      data: searchResult,
      loading: isSearchLoading,
    },
  ] = useLazyQuery(STOCK_SEARCHES_QUERY)
  const { data, loading, previousData } = useQuery(STOCK_SUMMARIES_QUERY, { variables: { yhCodeList } });
  const [userRowData, setUserRowData] = useReducer(
    (s, a) => ([...s, ...a]),
    [
      { code: 'MSFT', unitPrice: 10000, status: 'hold' },
      { code: 'WORK', unitPrice: 2000, status: 'hold' },
      { code: 'AAPL', unitPrice: 3000, status: 'hold' },
      { code: 'BABA', unitPrice: 1000, status: 'hold' },
    ],
    (initialState) => {
      try {
        return initialState;
        // const cache = JSON.parse(localStorage.getItem('_userPorfolioData') || '[]');
        // return cache;
      } catch (e) {
        return initialState;
      }
    },
  );

  const handleSearch = (value: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!value) return;

    const callback = () => getStockSearches({ variables: { q: value }});
    timeoutRef.current = setTimeout(callback, 500);
  }

  const handleChange = (value) => {
    if (!value) return;

    setYhCodeList(prev => {
      if (prev.length >= 10) {
        message.error('Maximum count of portfolio items are 10');
        return;
      }

      if (prev.includes(value)) {
        message.error(`${value} is already included in your portfolio`);
        return prev;
      }

      const nextState = [...prev, value];
      localStorage.setItem('_userPortfolio', JSON.stringify(nextState));

      return nextState;
    });
  }

  const createDeleteClick = useCallback((symbol: string) => () => {
    setYhCodeList((prev) => prev.filter(item => item !== symbol));
  }, [])

  const columns = useMemo(() => createColumns({ createDeleteClick }), [createDeleteClick])
  const dataSource = (data?.stockSummaries || previousData?.stockSummaries || []).map((item) => {
    const { code, ...rest } = userRowData.find(row => row.code === item.code) || {};
    return { ...item, ...rest };
  });

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Typography.Title level={2}>My Portfolio</Typography.Title>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Select
              showSearch
              filterOption={false}
              notFoundContent={null}
              onChange={handleChange}
              onSearch={handleSearch}
              loading={isSearchLoading}
              style={{ minWidth: 300 }}
              placeholder="Search & Add Symbol"
              defaultActiveFirstOption={false}
            >
              {searchResult?.stockSearches.quotes.map((quote) => {
                return (
                  <Select.Option key={quote.symbol} value={quote.symbol}>
                    ({quote.symbol}) {quote.shortname}
                  </Select.Option>
                );
              })}
            </Select>
          </Space>
          <Table
            bordered
            loading={loading}
            columns={columns}
            dataSource={dataSource}
            rowKey={record => record.code}
          />
        </Space>
      </Space>
    </div>
  )
}

const createColumns = ({ createDeleteClick }) => [
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
    },
  },
  {
    title: "Unit Price",
    dataIndex: "unitPrice",
    align: 'right' as const,
    render: (unitPrice) => formatNumber(unitPrice),
  },
  {
    title: 'Status',
    dataIndex: 'status',
    align: 'center' as const,
    render: (status) => {
      return <Tag>{status.toUpperCase()}</Tag>
    }
  },
  {
    title: "Action",
    dataIndex: "code",
    align: "center" as const,
    render: (code) => {
      return (
        <Popconfirm
          placement="right"
          onConfirm={createDeleteClick(code)}
          title={`Are you sure to delete ${code}?`}
        >
          <Button type="link" size="small">Delete</Button>
        </Popconfirm>
      )
    },
  },
];