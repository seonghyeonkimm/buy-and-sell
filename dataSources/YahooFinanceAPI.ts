import { RESTDataSource } from "apollo-datasource-rest";
import cheerio from 'cheerio';

class YahooFinanceAPI extends RESTDataSource {
  constructor() {
    super();
    this.baseURL = "https://finance.yahoo.com";
  }

  async getStockSearch(q: string) {
    const { quotes, news } = await this.get(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${q}`
    );

    return {
      news,
      quotes: quotes.filter((quote) => quote.typeDisp === 'Equity'),
    };
  }

  async getSummaries(yhCodeList: string[]) {
    const yahooData = await Promise.all(
      yhCodeList.map((code) =>
        (async () => {
          const html = await this.get(`/quote/${code}`);
          const $ = cheerio.load(html);

          const companyName = $("title").text().split(" Stock Price")[0];

          const leftSummaryTableData = {};
          $('[data-test="left-summary-table"] tr').each((_, element) => {
            const $tr = $(element);
            leftSummaryTableData[
              $tr.children().first().text()
            ] = $tr.children().last().text();
          });

          const rightSummaryTableData = {};
          $('[data-test="right-summary-table"] tr').each((_, element) => {
            const $tr = $(element);
            rightSummaryTableData[
              $tr.children().first().text()
            ] = $tr.children().last().text();
          });

          const summaryTableData = {
            ...leftSummaryTableData,
            ...rightSummaryTableData
          };

          const fetchedAt = new Date();
          const result = {
            code,
            companyName,
            previousClose: summaryTableData["Previous Close"],
            open: summaryTableData["Open"],
            bid: summaryTableData["Bid"],
            ask: summaryTableData["Ask"],
            daysRange: summaryTableData["Day's Range"],
            yearRange: summaryTableData["52 Week Range"],
            volume: summaryTableData["Volume"],
            avgVolume: summaryTableData["Avg. Volume"],
            marketCap: summaryTableData["Market Cap"],
            beta: summaryTableData["Beta (5Y Monthly)"],
            peRatio: summaryTableData["PE Ratio (TTM)"],
            eps: summaryTableData["EPS (TTM)"],
            earningsDate: summaryTableData["Earnings Date"],
            forwardDividendAndYield:
              summaryTableData["Forward Dividend & Yield"],
            exDividendDate: summaryTableData["Ex-Dividend Date"],
            thisYearTargetEst: summaryTableData["1y Target Est"],
            fetchedAt: fetchedAt.toISOString(),
          };

          return result;
        })()
      )
    );

    return yahooData;
  }
}

export default YahooFinanceAPI;
