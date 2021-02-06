let intlInstance;

export default function formatNumber(value: string) {
  if (!intlInstance) intlInstance = new Intl.NumberFormat();
  return intlInstance.format(value);
}