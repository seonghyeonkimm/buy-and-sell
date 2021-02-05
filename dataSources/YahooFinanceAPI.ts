import { RESTDataSource } from "apollo-datasource-rest";
import cheerio from 'cheerio';

class YahooFinanceAPI extends RESTDataSource {
  constructor() {
    super();
    this.baseURL = "https://finance.yahoo.com";
  }

  async getSummaries(yhCodeList: string[]) {
    const yahooData = await Promise.all(
      yhCodeList.map(code => (async () => {
        const html = await this.get(`/quote/${code}`)
        const $ = cheerio.load(html);

        const companyName = $('title').text().split(' Stock Price')[0];

        const leftSummaryTableData = {}
        $('[data-test="left-summary-table"] tr')
          .each((_, element) => {
            const $tr = $(element);
            leftSummaryTableData[$tr.children().first().text()] = $tr.children().last().text();
          });

        const rightSummaryTableData = {}
        $('[data-test="right-summary-table"] tr')
          .each((_, element) => {
            const $tr = $(element);
            rightSummaryTableData[$tr.children().first().text()] = $tr.children().last().text();
          });

        const fetchedAt = new Date();
        const result = {
          code,
          companyName,
          previousClose: leftSummaryTableData['Previous Close'],
          open: leftSummaryTableData['Open'],
          bid: leftSummaryTableData['Bid'],
          ask: leftSummaryTableData['Ask'],
          daysRange: leftSummaryTableData['Day\'s Range'],
          yearRange: leftSummaryTableData['52 Week Range'],
          volume: leftSummaryTableData['Volume'],
          avgVolume: leftSummaryTableData['Avg. Volume'],
          marketCap: rightSummaryTableData['Market Cap'],
          beta: rightSummaryTableData['Beta (5Y Monthly)'],
          peRatio: rightSummaryTableData['PE Ratio (TTM)'],
          eps: rightSummaryTableData['EPS (TTM)'],
          earningsDate: rightSummaryTableData['Earnings Date'],
          forwardDividendAndYield: rightSummaryTableData['Forward Dividend & Yield'],
          exDividendDate: rightSummaryTableData['Ex-Dividend Date'],
          thisYearTargetEst: rightSummaryTableData['1y Target Est'],
          fetchedAt: fetchedAt.toISOString(),
        }

        return result;
      })())
    );

    return yahooData;
  }
}

export default YahooFinanceAPI;
