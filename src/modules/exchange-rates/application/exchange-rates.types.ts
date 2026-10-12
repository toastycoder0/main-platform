export interface ExchangeRateListItemDTO {
  id: string;
  baseCode: string;
  quoteCode: string;
  rate: string;
  fetchedAt: Date;
  createdAt: Date;
}

export interface ExchangeRateFormDTO {
  id: string;
  baseCode: string;
  quoteCode: string;
  rate: string;
  fetchedAt: Date;
}
