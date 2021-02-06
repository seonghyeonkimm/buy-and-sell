import { Button, InputNumber, message, Popconfirm, Select, Space, Table, Tag, Typography } from "antd"
import { gql, useLazyQuery, useQuery } from "@apollo/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import formatNumber from "../utils/formatNumber";
import { getRecommendedStatus, userDataCache } from '../utils/apolloClient';

import styles from '../styles/Home.module.css';

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
      userData @client {
        status
        unitPrice
      }
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
  const dataSource = (data?.stockSummaries || previousData?.stockSummaries || []);

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
            rowClassName={styles.row}
            rowKey={record => record.code}
          />
        </Space>
      </Space>
    </div>
  )
}
const EditableUnitPriceCell = ({ record, unitPrice }: { record: Record<string, any>; unitPrice: string }) => {
  const { code } = record;
  const intUnitPrice = parseFloat(unitPrice || '0');
  const inputRef = useRef<HTMLInputElement>();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(intUnitPrice);

  const handleToggle = () => setEditing(prev => !prev);

  const handleChange = (value: number) => setValue(value);

  const handleSave = () => {
    const strUnitPrice = value.toString();
    const prev = userDataCache();
    const next = {
      ...prev,
      [code]: {
        unitPrice: strUnitPrice,
        status: getRecommendedStatus(value),
      },
    };
    userDataCache(next);
    localStorage.setItem(`_${code}unitPrice`, strUnitPrice);
    handleToggle();
  }

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  return editing ? (
    <InputNumber
      min={0}
      precision={3}
      ref={inputRef}
      value={value}
      onBlur={handleSave}
      onChange={handleChange}
      onPressEnter={handleSave}
      className={styles.unitPriceInput}
      parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
      formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
    />
  ) : (
    <div onClick={handleToggle} className={styles.unitPrice}>
      $ {formatNumber(value.toString())}
    </div>
  );
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
    title: () => <div className={styles.unitPriceTitle}>Unit Price</div>,
    dataIndex: ['userData', 'unitPrice'],
    render: (unitPrice, record) => {
      return <EditableUnitPriceCell unitPrice={unitPrice} record={record} />
    },
  },
  {
    title: 'Status',
    dataIndex: ['userData', 'status'],
    align: 'center' as const,
    render: (status) => {
      const color = status === 'buy' ? 'green' : status === 'sell' ? 'red' : undefined;
      return <Tag color={color}>{status.toUpperCase()}</Tag>
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