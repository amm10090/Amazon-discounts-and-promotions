export interface Product {
  asin: string;
  title?: string;
  image?: string;
  price?: string;
  priceDetails?: {
    amount: number;
    currency: string;
    displayAmount: string;
    pricePerUnit?: {
      amount: number;
      currency: string;
      displayAmount: string;
    };
    savingBasis?: {
      amount: number;
      currency: string;
      displayAmount: string;
      savingBasisType?: string;
      savingBasisTypeLabel?: string;
    };
    savings?: {
      amount: number;
      currency: string;
      displayAmount: string;
      percentage: number;
    };
    loyaltyPoints?: {
      points: number;
    };
  };
  condition?: {
    value: string;
    subCondition?: string;
    conditionNote?: string;
  };
  merchantInfo?: {
    name: string;
    id: string;
    feedbackCount?: number;
    feedbackRating?: number;
  };
  deliveryInfo?: {
    isAmazonFulfilled: boolean;
    isFreeShippingEligible: boolean;
    isPrimeEligible: boolean;
  };
  programEligibility?: {
    isPrimeExclusive: boolean;
    isPrimePantry: boolean;
  };
  offerSummary?: {
    condition?: string;
    lowestPrice?: string;
    highestPrice?: string;
    offerCount?: number;
  };
  availability?: {
    type: string;
    message?: string;
    maxOrderQuantity?: number;
    minOrderQuantity?: number;
  };
  dealDetails?: {
    accessType?: string;
    endTime?: string;
    startTime?: string;
    percentClaimed?: number;
  };
  isBuyBoxWinner?: boolean;
  violatesMAP?: boolean;
} 