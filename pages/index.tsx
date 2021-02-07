import { Button, InputNumber, message, Popconfirm, Select, Space, Table, Tag, Typography } from "antd"
import { gql, useLazyQuery, useQuery } from "@apollo/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import formatNumber from "../utils/formatNumber";
import { makeUserData, userDataCache } from '../utils/apolloClient';

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
        profitRate
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
    <div className={styles.container}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Typography.Title level={2}>My Portfolio</Typography.Title>
        <Typography.Paragraph>
          <Typography.Text mark>How to generate status:</Typography.Text>
          <br />
          <Space direction="vertical">
            <Typography.Text>
              1) If you has profit:
              <br/>
              <Space direction="vertical">
                <span>
                  &nbsp;&nbsp; Return <Tag color="red">SELL</Tag>if profitRate is greater than 50% or peRatio is greater than 100%
                </span>
                <span>
                  &nbsp;&nbsp; Return <Tag color="green">BUY</Tag>if eps is greater than 0 or peRatio is smaller than 50
                </span>
                <span>
                  &nbsp;&nbsp; Return <Tag>HOLD</Tag>if eps is greater than 0
                </span>
              </Space>
            </Typography.Text>
            <Typography.Text>
              2) If you has no profit:
              <br/>
              <Space direction="vertical">
                <span>
                  &nbsp;&nbsp; Return <Tag>HOLD</Tag>if profitRate is greater than -30%
                </span>
                <span>
                  &nbsp;&nbsp; Return <Tag color="red">SELL</Tag>if peRatio is greater than 100
                </span>
                <span>
                  &nbsp;&nbsp; Return <Tag color="green">BUY</Tag>if eps is greater than 0 or peRatio is smaller than 50
                </span>
                <span>
                  &nbsp;&nbsp; Return <Tag>HOLD</Tag>if eps is greater than 0
                </span>
              </Space>
            </Typography.Text>
            <Typography.Text>
              3) If you don't buy yet:
              <br/>
              <Space direction="vertical">
                <span>
                  &nbsp;&nbsp; Return <Tag>HOLD</Tag>if peRatio is greater than 100
                </span>
                <span>
                  &nbsp;&nbsp; Return <Tag color="green">BUY</Tag>if eps is greater than 0
                </span>
              </Space>
            </Typography.Text>
          </Space>
        </Typography.Paragraph>
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
const EditableUnitPriceCell = ({ record, unitPrice }: { record: Record<string, any>; unitPrice: number }) => {
  const { code } = record;
  const inputRef = useRef<HTMLInputElement>();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(unitPrice);

  const handleToggle = () => setEditing(prev => !prev);

  const handleChange = (value: number) => setValue(value);

  const handleSave = () => {
    const prev = userDataCache();
    const next = {
      ...prev,
      [code]: {
        unitPrice: value,
        ...makeUserData({ unitPrice: value, ...record }),
      },
    };
    userDataCache(next);
    localStorage.setItem(`_${code}unitPrice`, value.toString());
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
      precision={value.toString().indexOf('.') > -1 ? 3 : undefined}
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
    title: "Previous Close",
    dataIndex: "previousClose",
  },
  {
    title: "PE Ratio",
    dataIndex: "peRatio",
  },
  {
    title: "EPS",
    dataIndex: "eps",
  },
  {
    title: "Earnings Date",
    dataIndex: "earningsDate",
    render: (earningsDate) => {
      const [from, to] = earningsDate.split(' - ');
      return to || from;
    },
  },
  {
    width: 130,
    title: () => <div className={styles.unitPriceTitle}>Unit Price</div>,
    dataIndex: ['userData', 'unitPrice'],
    render: (unitPrice, record) => {
      return <EditableUnitPriceCell unitPrice={unitPrice} record={record} />
    },
  },
  {
    width: 120,
    title: 'Profit Rate',
    align: 'right' as const,
    dataIndex: ['userData', 'profitRate'],
    render: (profitRate) => {
      const intProfitRate = parseInt(profitRate, 10);
      return (
        <Typography.Text
          type={intProfitRate > 0 ? 'success' : intProfitRate === 0 ? undefined : 'danger'}
        >
          {intProfitRate}%
        </Typography.Text>
      );
    },
  },
  {
    width: 90,
    title: 'Status',
    dataIndex: ['userData', 'status'],
    align: 'center' as const,
    render: (status) => {
      const color = status === 'buy' ? 'green' : status === 'sell' ? 'red' : undefined;
      return <Tag color={color}>{status.toUpperCase()}</Tag>
    }
  },
  {
    width: 90,
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