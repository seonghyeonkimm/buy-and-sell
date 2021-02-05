import YahooFinanceAPI from './YahooFinanceAPI';

export default () => {
  return {
    yahooFinanceAPI: new YahooFinanceAPI(),
  };
}