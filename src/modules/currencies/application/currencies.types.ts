export interface CurrencyListItemDTO {
  code: string;
  name: string;
  decimalDigits: number;
  isActive: boolean;
  createdAt: Date;
}

export interface CurrencyFormDTO {
  code: string;
  name: string;
  decimalDigits: number;
  isActive: boolean;
}
